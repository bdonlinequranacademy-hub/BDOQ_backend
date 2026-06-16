"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStudentClassLogStats = getStudentClassLogStats;
exports.getLatestMonthlyProgressSummary = getLatestMonthlyProgressSummary;
exports.countExpectedWeeklySessions = countExpectedWeeklySessions;
exports.loadStudentRiskInputsBatch = loadStudentRiskInputsBatch;
exports.getRecentLogsForSlot = getRecentLogsForSlot;
const mongoose_1 = __importDefault(require("mongoose"));
const Attendance_1 = require("../models/Attendance");
const ClassLog_1 = require("../models/ClassLog");
const Homework_1 = require("../models/Homework");
const MonthlyProgressSnapshot_1 = require("../models/MonthlyProgressSnapshot");
const Progress_1 = require("../models/Progress");
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
async function getLatestMonthlyProgressSummary(studentId, classIds) {
    const snapshot = await MonthlyProgressSnapshot_1.MonthlyProgressSnapshot.findOne({
        student: studentId,
        class: { $in: classIds },
    })
        .sort({ month: -1 })
        .select("teacherSummary qaResponses month")
        .lean();
    if (!snapshot)
        return "";
    const qa = (snapshot.qaResponses ?? [])
        .map((r) => `${r.question}: ${r.answer}`)
        .join("; ");
    return [snapshot.teacherSummary, qa].filter(Boolean).join(" · ");
}
async function countExpectedWeeklySessions(studentId, teacherFilter = {}) {
    return SessionSlot_1.SessionSlot.countDocuments({
        student: studentId,
        isActive: true,
        ...teacherFilter,
    });
}
async function loadStudentRiskInputsBatch(studentIds, studentClassMap, start, end, teacherFilter = {}) {
    const result = new Map();
    if (studentIds.length === 0)
        return result;
    const studentOids = studentIds.map((id) => new mongoose_1.default.Types.ObjectId(id));
    const allClassIds = [
        ...new Set([...studentClassMap.values()].flatMap((ids) => ids.map((id) => id.toString()))),
    ].map((id) => new mongoose_1.default.Types.ObjectId(id));
    const startStr = start.toISOString().split("T")[0];
    const endStr = end.toISOString().split("T")[0];
    const [attendanceAgg, homeworkDocs, progressDocs, logAgg, slotAgg] = await Promise.all([
        Attendance_1.Attendance.aggregate([
            {
                $match: {
                    student: { $in: studentOids },
                    date: { $gte: start, $lte: end },
                },
            },
            {
                $group: {
                    _id: "$student",
                    total: { $sum: 1 },
                    missed: {
                        $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] },
                    },
                    lastPresent: {
                        $max: {
                            $cond: [
                                { $in: ["$status", ["present", "late"]] },
                                "$date",
                                null,
                            ],
                        },
                    },
                },
            },
        ]),
        Homework_1.Homework.find({ class: { $in: allClassIds } })
            .select("class submissions.student")
            .lean(),
        Progress_1.Progress.find({ student: { $in: studentOids } })
            .select("student tajweedScore updatedAt")
            .sort({ updatedAt: 1 })
            .lean(),
        ClassLog_1.ClassLog.aggregate([
            {
                $match: {
                    student: { $in: studentOids },
                    sessionDate: { $gte: startStr, $lte: endStr },
                },
            },
            {
                $group: {
                    _id: { student: "$student", status: "$status" },
                    count: { $sum: 1 },
                },
            },
        ]),
        SessionSlot_1.SessionSlot.aggregate([
            {
                $match: {
                    student: { $in: studentOids },
                    isActive: true,
                    ...teacherFilter,
                },
            },
            { $group: { _id: "$student", count: { $sum: 1 } } },
        ]),
    ]);
    const attendanceByStudent = new Map(attendanceAgg.map((row) => [row._id.toString(), row]));
    const progressByStudent = new Map();
    for (const row of progressDocs) {
        const sid = row.student.toString();
        const scores = progressByStudent.get(sid) ?? [];
        scores.push(row.tajweedScore);
        progressByStudent.set(sid, scores);
    }
    const logStatsByStudent = new Map();
    for (const row of logAgg) {
        const sid = row._id.student.toString();
        const current = logStatsByStudent.get(sid) ?? { approved: 0, rejected: 0 };
        if (row._id.status === "approved")
            current.approved += row.count;
        if (row._id.status === "rejected")
            current.rejected += row.count;
        logStatsByStudent.set(sid, current);
    }
    const slotsByStudent = new Map(slotAgg.map((row) => [row._id.toString(), row.count]));
    const homeworkByClass = new Map();
    for (const hw of homeworkDocs) {
        const key = hw.class.toString();
        const list = homeworkByClass.get(key) ?? [];
        list.push(hw);
        homeworkByClass.set(key, list);
    }
    for (const studentId of studentIds) {
        const classIdSet = new Set((studentClassMap.get(studentId) ?? []).map((id) => id.toString()));
        let totalHomework = 0;
        let homeworkSubmitted = 0;
        for (const classId of classIdSet) {
            for (const hw of homeworkByClass.get(classId) ?? []) {
                totalHomework += 1;
                if (hw.submissions?.some((s) => s.student.toString() === studentId)) {
                    homeworkSubmitted += 1;
                }
            }
        }
        const attendance = attendanceByStudent.get(studentId);
        const tajweedScores = progressByStudent.get(studentId) ?? [];
        const logStats = logStatsByStudent.get(studentId) ?? {
            approved: 0,
            rejected: 0,
        };
        result.set(studentId, {
            missedClasses: attendance?.missed ?? 0,
            totalClasses: attendance?.total ?? 0,
            homeworkSubmitted,
            totalHomework,
            minTajweed: tajweedScores.length > 0 ? Math.min(...tajweedScores) : 100,
            tajweedScores,
            lastPresent: attendance?.lastPresent ?? null,
            logApproved: logStats.approved,
            logRejected: logStats.rejected,
            weeklySlots: slotsByStudent.get(studentId) ?? 0,
        });
    }
    return result;
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
