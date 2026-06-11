"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createClassLog = createClassLog;
exports.getTeacherClassLogs = getTeacherClassLogs;
exports.getTeacherClassLogById = getTeacherClassLogById;
exports.getAdminClassLogs = getAdminClassLogs;
exports.approveClassLog = approveClassLog;
exports.rejectClassLog = rejectClassLog;
exports.getTeacherLogStats = getTeacherLogStats;
const ClassLog_1 = require("../models/ClassLog");
const Notification_1 = require("../models/Notification");
const SessionSlot_1 = require("../models/SessionSlot");
const User_1 = require("../models/User");
const earningsService_1 = require("./earningsService");
const scheduleUtils_1 = require("../utils/scheduleUtils");
function formatLog(log, student, teacher, classDoc) {
    return {
        _id: log._id.toString(),
        sessionSlotId: log.sessionSlot.toString(),
        classId: classDoc._id.toString(),
        classTitle: classDoc.title,
        courseType: log.courseType,
        sessionDate: log.sessionDate,
        durationMinutes: log.durationMinutes,
        durationLabel: (0, scheduleUtils_1.formatDuration)(log.durationMinutes),
        lessonReport: log.lessonReport,
        topicsCovered: log.topicsCovered ?? [],
        status: log.status,
        adminNote: log.adminNote,
        approvedAt: log.approvedAt?.toISOString(),
        earningsBdt: log.earningsBdt,
        createdAt: log.createdAt.toISOString(),
        student: {
            _id: student._id.toString(),
            name: student.name,
            studentId: student.studentId ?? undefined,
            country: student.country ?? undefined,
            timezone: student.timezone || "UTC",
        },
        teacher: {
            _id: teacher._id.toString(),
            name: teacher.name,
            timezone: teacher.timezone || scheduleUtils_1.ACADEMY_TIMEZONE,
        },
        times: {
            academy: {
                label: "BD",
                time: log.times.academy.time,
                timezone: log.times.academy.timezone,
            },
            teacher: {
                label: "Tea",
                time: log.times.teacher.time,
                timezone: log.times.teacher.timezone,
            },
            student: {
                label: "Stu",
                time: log.times.student.time,
                timezone: log.times.student.timezone,
            },
        },
    };
}
async function mapLogs(logs) {
    return logs.map((log) => formatLog(log, log.student, log.teacher, log.class));
}
async function notifyAdmins(title, message) {
    const admins = await User_1.User.find({ role: "admin", isActive: true }).select("_id");
    if (admins.length === 0)
        return;
    await Notification_1.Notification.insertMany(admins.map((admin) => ({
        user: admin._id,
        title,
        message,
        type: "class",
    })));
}
async function createClassLog(input) {
    const slot = await SessionSlot_1.SessionSlot.findOne({
        _id: input.sessionSlotId,
        teacher: input.teacherId,
        isActive: true,
    })
        .populate("student", "name timezone country studentId")
        .populate("teacher", "name timezone")
        .populate("class", "title meetingLink");
    if (!slot) {
        throw new Error("SESSION_SLOT_NOT_FOUND");
    }
    const student = slot.student;
    const teacher = slot.teacher;
    const classDoc = slot.class;
    const day = slot.day;
    const studentTz = student.timezone || "UTC";
    const teacherTz = teacher.timezone || scheduleUtils_1.ACADEMY_TIMEZONE;
    const existing = await ClassLog_1.ClassLog.findOne({
        sessionSlot: slot._id,
        sessionDate: input.sessionDate,
    });
    if (existing) {
        throw new Error("LOG_ALREADY_EXISTS");
    }
    const log = await ClassLog_1.ClassLog.create({
        sessionSlot: slot._id,
        class: classDoc._id,
        teacher: input.teacherId,
        student: student._id,
        sessionDate: input.sessionDate,
        durationMinutes: slot.durationMinutes,
        courseType: slot.courseType || classDoc.title,
        lessonReport: input.lessonReport.trim(),
        topicsCovered: input.topicsCovered ?? [],
        status: "pending",
        times: {
            academy: {
                time: (0, scheduleUtils_1.formatWeeklyTime)(day, slot.startTime, scheduleUtils_1.ACADEMY_TIMEZONE),
                timezone: scheduleUtils_1.ACADEMY_TIMEZONE,
            },
            teacher: {
                time: (0, scheduleUtils_1.formatWeeklyTime)(day, slot.startTime, teacherTz),
                timezone: teacherTz,
            },
            student: {
                time: (0, scheduleUtils_1.formatWeeklyTime)(day, slot.startTime, studentTz),
                timezone: studentTz,
            },
        },
    });
    await notifyAdmins("Class log pending approval", `${teacher.name} submitted a class log for ${student.name} (${input.sessionDate}).`);
    const populated = await ClassLog_1.ClassLog.findById(log._id)
        .populate("student", "name timezone country studentId")
        .populate("teacher", "name timezone")
        .populate("class", "title meetingLink");
    return formatLog(populated, populated.student, populated.teacher, populated.class);
}
async function getTeacherClassLogs(teacherId, status) {
    const filter = { teacher: teacherId };
    if (status)
        filter.status = status;
    const logs = await ClassLog_1.ClassLog.find(filter)
        .populate("student", "name timezone country studentId")
        .populate("teacher", "name timezone")
        .populate("class", "title meetingLink")
        .sort({ sessionDate: -1, createdAt: -1 });
    return mapLogs(logs);
}
async function getTeacherClassLogById(teacherId, logId) {
    const log = await ClassLog_1.ClassLog.findOne({ _id: logId, teacher: teacherId })
        .populate("student", "name timezone country studentId")
        .populate("teacher", "name timezone")
        .populate("class", "title meetingLink");
    if (!log)
        return null;
    return formatLog(log, log.student, log.teacher, log.class);
}
async function getAdminClassLogs(status) {
    const filter = {};
    if (status)
        filter.status = status;
    const logs = await ClassLog_1.ClassLog.find(filter)
        .populate("student", "name timezone country studentId")
        .populate("teacher", "name timezone")
        .populate("class", "title meetingLink")
        .sort({ createdAt: -1 });
    return mapLogs(logs);
}
async function approveClassLog(logId, adminId) {
    const existing = await ClassLog_1.ClassLog.findById(logId);
    if (!existing)
        return null;
    const earningsBdt = await (0, earningsService_1.computeEarningsOnApproval)(existing.class);
    const log = await ClassLog_1.ClassLog.findByIdAndUpdate(logId, {
        status: "approved",
        approvedBy: adminId,
        approvedAt: new Date(),
        adminNote: undefined,
        earningsBdt,
    }, { new: true })
        .populate("student", "name timezone country studentId")
        .populate("teacher", "name timezone")
        .populate("class", "title meetingLink");
    if (!log)
        return null;
    await Notification_1.Notification.create({
        user: log.teacher,
        title: "Class log approved",
        message: `Your class log for ${log.student.name} on ${log.sessionDate} was approved.`,
        type: "class",
    });
    return formatLog(log, log.student, log.teacher, log.class);
}
async function rejectClassLog(logId, adminId, adminNote) {
    const log = await ClassLog_1.ClassLog.findByIdAndUpdate(logId, {
        status: "rejected",
        approvedBy: adminId,
        approvedAt: new Date(),
        adminNote: adminNote?.trim() || "Rejected by admin",
    }, { new: true })
        .populate("student", "name timezone country studentId")
        .populate("teacher", "name timezone")
        .populate("class", "title meetingLink");
    if (!log)
        return null;
    await Notification_1.Notification.create({
        user: log.teacher,
        title: "Class log rejected",
        message: `Your class log for ${log.student.name} on ${log.sessionDate} needs revision.`,
        type: "class",
    });
    return formatLog(log, log.student, log.teacher, log.class);
}
async function getTeacherLogStats(teacherId) {
    const [pending, approved, rejected] = await Promise.all([
        ClassLog_1.ClassLog.countDocuments({ teacher: teacherId, status: "pending" }),
        ClassLog_1.ClassLog.countDocuments({ teacher: teacherId, status: "approved" }),
        ClassLog_1.ClassLog.countDocuments({ teacher: teacherId, status: "rejected" }),
    ]);
    return { pending, approved, rejected };
}
