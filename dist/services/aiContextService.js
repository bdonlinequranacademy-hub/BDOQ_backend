"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStudentClassLogStats = getStudentClassLogStats;
exports.countExpectedWeeklySessions = countExpectedWeeklySessions;
exports.getRecentLogsForSlot = getRecentLogsForSlot;
const ClassLog_1 = require("../models/ClassLog");
const SessionSlot_1 = require("../models/SessionSlot");
async function getStudentClassLogStats(studentId, classIds, start, end) {
    const startStr = start.toISOString().split("T")[0];
    const endStr = end.toISOString().split("T")[0];
    const logs = await ClassLog_1.ClassLog.find({
        student: studentId,
        class: { $in: classIds },
        sessionDate: { $gte: startStr, $lte: endStr },
    })
        .sort({ sessionDate: -1 })
        .limit(20)
        .lean();
    const approved = logs.filter((l) => l.status === "approved");
    const pending = logs.filter((l) => l.status === "pending");
    const rejected = logs.filter((l) => l.status === "rejected");
    const recentTopics = [
        ...new Set(approved.flatMap((l) => l.topicsCovered ?? []).filter(Boolean)),
    ].slice(0, 8);
    const recentSummaries = approved
        .map((l) => l.lessonReport)
        .filter(Boolean)
        .slice(0, 3);
    return {
        approved: approved.length,
        pending: pending.length,
        rejected: rejected.length,
        recentTopics,
        recentSummaries,
    };
}
async function countExpectedWeeklySessions(studentId, teacherFilter = {}) {
    return SessionSlot_1.SessionSlot.countDocuments({
        student: studentId,
        isActive: true,
        ...teacherFilter,
    });
}
async function getRecentLogsForSlot(sessionSlotId, limit = 3) {
    return ClassLog_1.ClassLog.find({
        sessionSlot: sessionSlotId,
        status: "approved",
    })
        .sort({ sessionDate: -1 })
        .limit(limit)
        .select("sessionDate lessonReport topicsCovered")
        .lean();
}
