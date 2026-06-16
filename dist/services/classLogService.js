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
const notificationService_1 = require("./notificationService");
const SessionSlot_1 = require("../models/SessionSlot");
const earningsService_1 = require("./earningsService");
const scheduleUtils_1 = require("../utils/scheduleUtils");
const curriculumService_1 = require("./curriculumService");
const LOG_POPULATE = [
    { path: "student", select: "name timezone country studentId" },
    { path: "teacher", select: "name timezone" },
    { path: "class", select: "title meetingLink" },
];
function snapshotRefs(log) {
    return {
        student: log.get("student"),
        teacher: log.get("teacher"),
        class: log.get("class"),
    };
}
function resolvePopulatedUser(ref, populated, fallbackName) {
    const user = populated;
    if (user?._id)
        return user;
    return {
        _id: ref,
        name: fallbackName,
        timezone: "UTC",
    };
}
function resolvePopulatedClass(ref, populated) {
    const classDoc = populated;
    if (classDoc?._id)
        return classDoc;
    return {
        _id: ref,
        title: "Deleted class",
    };
}
function formatLog(log, refs) {
    const student = resolvePopulatedUser(refs.student, log.student, "Deleted student");
    const teacher = resolvePopulatedUser(refs.teacher, log.teacher, "Deleted teacher");
    const classDoc = resolvePopulatedClass(refs.class, log.class);
    const times = log.times ?? {
        academy: { time: "—", timezone: scheduleUtils_1.ACADEMY_TIMEZONE },
        teacher: { time: "—", timezone: scheduleUtils_1.ACADEMY_TIMEZONE },
        student: { time: "—", timezone: "UTC" },
    };
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
        curriculumProgram: log.curriculumProgram,
        curriculumUnit: log.curriculumUnit,
        curriculumTopic: log.curriculumTopic,
        curriculumLabels: (0, curriculumService_1.resolveCurriculumLabels)(log.curriculumProgram, log.curriculumUnit, log.curriculumTopic),
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
                time: times.academy.time,
                timezone: times.academy.timezone,
            },
            teacher: {
                label: "Tea",
                time: times.teacher.time,
                timezone: times.teacher.timezone,
            },
            student: {
                label: "Stu",
                time: times.student.time,
                timezone: times.student.timezone,
            },
        },
    };
}
async function mapLogs(logs) {
    if (logs.length === 0)
        return [];
    const refs = logs.map(snapshotRefs);
    await ClassLog_1.ClassLog.populate(logs, [...LOG_POPULATE]);
    return logs.map((log, index) => formatLog(log, refs[index]));
}
async function notifyAdmins(title, message) {
    await (0, notificationService_1.notifyAdmins)(title, message, "class");
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
        curriculumProgram: input.curriculumProgram,
        curriculumUnit: input.curriculumUnit,
        curriculumTopic: input.curriculumTopic,
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
    const populated = await ClassLog_1.ClassLog.findById(log._id);
    if (!populated)
        throw new Error("LOG_CREATE_FAILED");
    const refs = snapshotRefs(populated);
    await populated.populate([...LOG_POPULATE]);
    return formatLog(populated, refs);
}
async function getTeacherClassLogs(teacherId, status) {
    const filter = { teacher: teacherId };
    if (status)
        filter.status = status;
    const logs = await ClassLog_1.ClassLog.find(filter).sort({ sessionDate: -1, createdAt: -1 });
    return mapLogs(logs);
}
async function getTeacherClassLogById(teacherId, logId) {
    const log = await ClassLog_1.ClassLog.findOne({ _id: logId, teacher: teacherId });
    if (!log)
        return null;
    const refs = snapshotRefs(log);
    await log.populate([...LOG_POPULATE]);
    return formatLog(log, refs);
}
async function getAdminClassLogs(status) {
    const filter = {};
    if (status)
        filter.status = status;
    const logs = await ClassLog_1.ClassLog.find(filter)
        .sort({ createdAt: -1 })
        .limit(300);
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
    }, { new: true });
    if (!log)
        return null;
    const refs = snapshotRefs(log);
    await log.populate([...LOG_POPULATE]);
    const view = formatLog(log, refs);
    await (0, notificationService_1.createUserNotification)({
        userId: log.teacher,
        title: "Class log approved",
        message: `Your class log for ${view.student.name} on ${log.sessionDate} was approved.`,
        type: "class",
    });
    return view;
}
async function rejectClassLog(logId, adminId, adminNote) {
    const log = await ClassLog_1.ClassLog.findByIdAndUpdate(logId, {
        status: "rejected",
        approvedBy: adminId,
        approvedAt: new Date(),
        adminNote: adminNote?.trim() || "Rejected by admin",
    }, { new: true });
    if (!log)
        return null;
    const refs = snapshotRefs(log);
    await log.populate([...LOG_POPULATE]);
    const view = formatLog(log, refs);
    await (0, notificationService_1.createUserNotification)({
        userId: log.teacher,
        title: "Class log rejected",
        message: `Your class log for ${view.student.name} on ${log.sessionDate} needs revision.`,
        type: "class",
    });
    return view;
}
async function getTeacherLogStats(teacherId) {
    const [pending, approved, rejected] = await Promise.all([
        ClassLog_1.ClassLog.countDocuments({ teacher: teacherId, status: "pending" }),
        ClassLog_1.ClassLog.countDocuments({ teacher: teacherId, status: "approved" }),
        ClassLog_1.ClassLog.countDocuments({ teacher: teacherId, status: "rejected" }),
    ]);
    return { pending, approved, rejected };
}
