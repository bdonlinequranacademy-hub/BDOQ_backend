"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAtRiskStudents = void 0;
const Class_1 = require("../models/Class");
const aiContextService_1 = require("../services/aiContextService");
const studentCareService_1 = require("../services/studentCareService");
const AT_RISK_CACHE_TTL_MS = 5 * 60000;
const atRiskCache = new Map();
const getLast30DaysRange = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
};
const computeRiskLevel = (factorCount, missedClasses, hasAttendanceRisk) => {
    if (factorCount >= 2)
        return "high";
    if (factorCount === 1 && hasAttendanceRisk && missedClasses === 3) {
        return "low";
    }
    return "medium";
};
function buildTajweedTrend(scores) {
    if (scores.length === 0)
        return "No record";
    if (scores.length === 1)
        return `${scores[0]}/100`;
    const latest = scores[scores.length - 1];
    const previous = scores[scores.length - 2];
    const direction = latest > previous ? "improving" : latest < previous ? "declining" : "stable";
    return `${latest}/100 (${direction}, previously ${previous})`;
}
const getAtRiskStudents = async (req, res) => {
    try {
        const cacheKey = `${req.user.role}:${req.user._id.toString()}`;
        const cached = atRiskCache.get(cacheKey);
        if (cached && cached.expires > Date.now()) {
            res.status(200).json({
                success: true,
                message: "Student care alerts fetched successfully",
                data: cached.data,
            });
            return;
        }
        const classFilter = req.user.role === "teacher" ? { teacher: req.user._id } : {};
        const classes = await Class_1.Class.find(classFilter)
            .select("students teacher")
            .populate("students", "name email role")
            .lean();
        const studentMap = new Map();
        const studentClassMap = new Map();
        for (const cls of classes) {
            for (const student of cls.students) {
                if (!student || student.role !== "student")
                    continue;
                const studentId = student._id.toString();
                studentMap.set(studentId, student);
                const classIds = studentClassMap.get(studentId) ?? [];
                classIds.push(cls._id);
                studentClassMap.set(studentId, classIds);
            }
        }
        const { start, end } = getLast30DaysRange();
        const studentIds = [...studentMap.keys()];
        const teacherSlotFilter = req.user.role === "teacher" ? { teacher: req.user._id } : {};
        const riskInputs = await (0, aiContextService_1.loadStudentRiskInputsBatch)(studentIds, studentClassMap, start, end, teacherSlotFilter);
        const atRiskProfiles = [];
        for (const [studentId, student] of studentMap) {
            const inputs = riskInputs.get(studentId);
            if (!inputs)
                continue;
            const { missedClasses, totalClasses, homeworkSubmitted, totalHomework, minTajweed, tajweedScores, lastPresent, logApproved, logRejected, weeklySlots, } = inputs;
            const homeworkMissed = totalHomework - homeworkSubmitted;
            const submissionRate = totalHomework > 0 ? homeworkSubmitted / totalHomework : 1;
            const reasons = [];
            const hasAttendanceRisk = missedClasses >= 3;
            const hasHomeworkRisk = totalHomework > 0 && submissionRate < 0.5;
            const hasScoreRisk = tajweedScores.length > 0 && minTajweed < 50;
            const hasRejectedLogRisk = logRejected >= 2;
            const hasMissingLogRisk = weeklySlots > 0 && logApproved === 0;
            if (hasAttendanceRisk) {
                reasons.push(`Missed ${missedClasses} classes in the last 30 days`);
            }
            if (hasHomeworkRisk) {
                reasons.push(`Homework submission rate below 50% (${homeworkSubmitted}/${totalHomework})`);
            }
            if (hasScoreRisk) {
                reasons.push(`Tajweed score below 50 (${minTajweed}/100)`);
            }
            if (hasRejectedLogRisk) {
                reasons.push(`${logRejected} rejected session logs in the last 30 days`);
            }
            if (hasMissingLogRisk) {
                reasons.push("No verified session logs in the last 30 days despite active schedule");
            }
            const factorCount = (hasAttendanceRisk ? 1 : 0) +
                (hasHomeworkRisk ? 1 : 0) +
                (hasScoreRisk ? 1 : 0) +
                (hasRejectedLogRisk ? 1 : 0) +
                (hasMissingLogRisk ? 1 : 0);
            if (factorCount === 0)
                continue;
            const riskLevel = computeRiskLevel(factorCount, missedClasses, hasAttendanceRisk);
            atRiskProfiles.push({
                student,
                missedClasses,
                totalClasses,
                homeworkMissed,
                totalHomework,
                tajweedScoreTrend: buildTajweedTrend(tajweedScores),
                lastAttendance: lastPresent,
                reasons,
                riskLevel,
                verifiedSessions: logApproved,
                rejectedLogs: logRejected,
            });
        }
        const results = atRiskProfiles.map((profile) => {
            const suggestedFollowUp = (0, studentCareService_1.buildSuggestedFollowUp)({
                studentName: profile.student.name,
                missedClasses: profile.missedClasses,
                totalClasses: profile.totalClasses,
                homeworkMissed: profile.homeworkMissed,
                totalHomework: profile.totalHomework,
                tajweedScoreTrend: profile.tajweedScoreTrend,
                lastAttendanceDate: profile.lastAttendance
                    ? profile.lastAttendance.toLocaleDateString("en-GB")
                    : "No attendance recorded",
                reasons: profile.reasons,
            });
            return {
                studentId: profile.student._id.toString(),
                studentName: profile.student.name,
                student: {
                    _id: profile.student._id.toString(),
                    name: profile.student.name,
                    email: profile.student.email,
                },
                riskLevel: profile.riskLevel,
                reasons: profile.reasons,
                suggestedFollowUp,
                aiGuidance: suggestedFollowUp,
                lastAttendance: profile.lastAttendance,
                verifiedSessions: profile.verifiedSessions,
                rejectedLogs: profile.rejectedLogs,
            };
        });
        results.sort((a, b) => {
            const order = { high: 0, medium: 1, low: 2 };
            return order[a.riskLevel] - order[b.riskLevel];
        });
        atRiskCache.set(cacheKey, {
            expires: Date.now() + AT_RISK_CACHE_TTL_MS,
            data: results,
        });
        res.status(200).json({
            success: true,
            message: "Student care alerts fetched successfully",
            data: results,
        });
    }
    catch (error) {
        console.error("getAtRiskStudents error", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch student care alerts",
            data: null,
        });
    }
};
exports.getAtRiskStudents = getAtRiskStudents;
