"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTeacherEarnings = getTeacherEarnings;
exports.getAdminEarningsOverview = getAdminEarningsOverview;
exports.computeEarningsOnApproval = computeEarningsOnApproval;
const Class_1 = require("../models/Class");
const ClassLog_1 = require("../models/ClassLog");
const DEFAULT_SESSION_RATE_BDT = 500;
function monthPrefix(month) {
    return month;
}
async function resolveRate(classId) {
    const classDoc = await Class_1.Class.findById(classId).select("sessionRateBdt");
    return classDoc?.sessionRateBdt ?? DEFAULT_SESSION_RATE_BDT;
}
function earningsForLog(log, rate) {
    if (log.status === "approved") {
        return log.earningsBdt ?? rate;
    }
    if (log.status === "pending") {
        return rate;
    }
    return 0;
}
async function getTeacherEarnings(teacherId, month) {
    const prefix = monthPrefix(month);
    const logs = await ClassLog_1.ClassLog.find({
        teacher: teacherId,
        sessionDate: { $regex: `^${prefix}` },
    })
        .populate("student", "name studentId")
        .populate("class", "title sessionRateBdt")
        .sort({ sessionDate: -1 });
    const rateCache = new Map();
    const byCourseMap = new Map();
    const sessions = [];
    let totalBdt = 0;
    let verifiedSessions = 0;
    let pendingSessions = 0;
    let pendingBdt = 0;
    let rejectedSessions = 0;
    for (const log of logs) {
        const populatedClass = log.class;
        const classId = populatedClass._id?.toString() ??
            log.class.toString();
        let rate = rateCache.get(classId);
        if (rate === undefined) {
            rate =
                populatedClass.sessionRateBdt ??
                    (await resolveRate(log.class));
            rateCache.set(classId, rate);
        }
        const amount = earningsForLog(log, rate);
        const student = log.student;
        sessions.push({
            logId: log._id.toString(),
            sessionDate: log.sessionDate,
            studentName: student.name ?? "Student",
            studentId: student.studentId ?? undefined,
            classTitle: populatedClass.title ?? "Class",
            courseType: log.courseType,
            durationMinutes: log.durationMinutes,
            earningsBdt: log.status === "approved" ? amount : 0,
            status: log.status,
        });
        if (log.status === "approved") {
            verifiedSessions += 1;
            totalBdt += amount;
            const course = log.courseType || "Quran";
            const entry = byCourseMap.get(course) ?? { courseType: course, sessions: 0, totalBdt: 0 };
            entry.sessions += 1;
            entry.totalBdt += amount;
            byCourseMap.set(course, entry);
        }
        else if (log.status === "pending") {
            pendingSessions += 1;
            pendingBdt += rate;
        }
        else {
            rejectedSessions += 1;
        }
    }
    return {
        month,
        totalBdt,
        verifiedSessions,
        pendingSessions,
        pendingBdt,
        rejectedSessions,
        byCourse: Array.from(byCourseMap.values()).sort((a, b) => b.totalBdt - a.totalBdt),
        sessions,
    };
}
async function getAdminEarningsOverview(month) {
    const prefix = monthPrefix(month);
    const logs = await ClassLog_1.ClassLog.find({
        sessionDate: { $regex: `^${prefix}` },
    })
        .populate("teacher", "name")
        .populate("class", "sessionRateBdt");
    const teacherMap = new Map();
    let totalBdt = 0;
    let verifiedSessions = 0;
    let pendingSessions = 0;
    for (const log of logs) {
        const teacher = log.teacher;
        const teacherId = teacher._id.toString();
        const rate = log.class.sessionRateBdt ?? DEFAULT_SESSION_RATE_BDT;
        const row = teacherMap.get(teacherId) ??
            {
                teacherId,
                teacherName: teacher.name ?? "Teacher",
                verifiedSessions: 0,
                pendingSessions: 0,
                totalBdt: 0,
                pendingBdt: 0,
            };
        if (log.status === "approved") {
            const amount = log.earningsBdt ?? rate;
            row.verifiedSessions += 1;
            row.totalBdt += amount;
            totalBdt += amount;
            verifiedSessions += 1;
        }
        else if (log.status === "pending") {
            row.pendingSessions += 1;
            row.pendingBdt += rate;
            pendingSessions += 1;
        }
        teacherMap.set(teacherId, row);
    }
    return {
        month,
        totalBdt,
        verifiedSessions,
        pendingSessions,
        teachers: Array.from(teacherMap.values()).sort((a, b) => b.totalBdt - a.totalBdt),
    };
}
async function computeEarningsOnApproval(classId) {
    return resolveRate(classId);
}
