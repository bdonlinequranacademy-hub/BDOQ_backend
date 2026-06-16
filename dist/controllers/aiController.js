"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateClassLogDraftHandler = exports.generateStudyPlan = exports.generateProgressReport = exports.generateEarlyWarningHandler = exports.getAtRiskStudents = exports.generateParentSummary = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const User_1 = require("../models/User");
const Class_1 = require("../models/Class");
const Attendance_1 = require("../models/Attendance");
const Homework_1 = require("../models/Homework");
const Progress_1 = require("../models/Progress");
const geminiService_1 = require("../services/ai/geminiService");
const aiLocale_1 = require("../services/ai/aiLocale");
const aiErrors_1 = require("../services/ai/aiErrors");
const aiContextService_1 = require("../services/aiContextService");
const SessionSlot_1 = require("../models/SessionSlot");
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
const buildTajweedTrend = (scores) => {
    if (scores.length === 0)
        return "কোনো রেকর্ড নেই";
    if (scores.length === 1)
        return `${scores[0]}/100`;
    const latest = scores[scores.length - 1];
    const previous = scores[scores.length - 2];
    const direction = latest > previous ? "উন্নতি" : latest < previous ? "অবনতি" : "স্থির";
    return `${latest}/100 (${direction}, আগে ${previous})`;
};
const ensureGeminiKey = (res) => {
    if (!process.env.GEMINI_API_KEY) {
        res.status(500).json({
            success: false,
            message: "GEMINI_API_KEY is not configured",
            data: null,
        });
        return false;
    }
    return true;
};
const respondAiError = (res, error, logLabel, fallbackMessage) => {
    const errMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`${logLabel}:`, errMessage);
    res.status((0, aiErrors_1.aiErrorStatus)(error)).json({
        success: false,
        message: (0, aiErrors_1.aiErrorMessage)(error, fallbackMessage),
        data: process.env.NODE_ENV === "development" ? { error: errMessage } : null,
    });
};
const getStudentWithAccess = async (req, res, studentId, allowSelf = false) => {
    if (!mongoose_1.default.Types.ObjectId.isValid(studentId)) {
        res.status(400).json({
            success: false,
            message: "Invalid student ID",
            data: null,
        });
        return null;
    }
    if (allowSelf && req.user.role === "student") {
        if (req.user._id.toString() !== studentId) {
            res.status(403).json({
                success: false,
                message: "You can only generate a study plan for yourself",
                data: null,
            });
            return null;
        }
    }
    const student = await User_1.User.findOne({ _id: studentId, role: "student" });
    if (!student) {
        res.status(404).json({
            success: false,
            message: "Student not found",
            data: null,
        });
        return null;
    }
    if (req.user.role === "teacher") {
        const teachesStudent = await Class_1.Class.exists({
            teacher: req.user._id,
            students: studentId,
        });
        if (!teachesStudent) {
            res.status(403).json({
                success: false,
                message: "Access denied for this student",
                data: null,
            });
            return null;
        }
    }
    return student;
};
const getCurrentLevel = (tajweedScore) => {
    if (tajweedScore >= 80)
        return "Advanced";
    if (tajweedScore >= 50)
        return "Intermediate";
    return "Beginner";
};
const parseDateRange = (weekStart, weekEnd) => {
    const start = new Date(weekStart);
    const end = new Date(weekEnd);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
};
const generateParentSummary = async (req, res) => {
    try {
        const { studentId, weekStart, weekEnd } = req.body;
        if (!studentId || !weekStart || !weekEnd) {
            res.status(400).json({
                success: false,
                message: "Please provide studentId, weekStart, and weekEnd",
                data: null,
            });
            return;
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(studentId)) {
            res.status(400).json({
                success: false,
                message: "Invalid student ID",
                data: null,
            });
            return;
        }
        if (!process.env.GEMINI_API_KEY) {
            res.status(500).json({
                success: false,
                message: "GEMINI_API_KEY is not configured",
                data: null,
            });
            return;
        }
        const student = await User_1.User.findOne({ _id: studentId, role: "student" });
        if (!student) {
            res.status(404).json({
                success: false,
                message: "Student not found",
                data: null,
            });
            return;
        }
        if (req.user.role === "teacher") {
            const teachesStudent = await Class_1.Class.exists({
                teacher: req.user._id,
                students: studentId,
            });
            if (!teachesStudent) {
                res.status(403).json({
                    success: false,
                    message: "Access denied for this student",
                    data: null,
                });
                return;
            }
        }
        if (req.user.role === "student") {
            if (studentId !== req.user._id.toString()) {
                res.status(403).json({
                    success: false,
                    message: "You can only generate a summary for your own account",
                    data: null,
                });
                return;
            }
        }
        if (req.user.role === "parent") {
            const parent = await User_1.User.findById(req.user._id).select("children");
            const linked = parent?.children?.some((id) => id.toString() === studentId);
            if (!linked) {
                res.status(403).json({
                    success: false,
                    message: "Access denied for this student",
                    data: null,
                });
                return;
            }
        }
        const { start, end } = parseDateRange(weekStart, weekEnd);
        const attendanceRecords = await Attendance_1.Attendance.find({
            student: studentId,
            date: { $gte: start, $lte: end },
        });
        const totalClasses = attendanceRecords.length;
        const attendedClasses = attendanceRecords.filter((r) => r.status === "present" || r.status === "late").length;
        const enrolledClasses = await Class_1.Class.find({ students: studentId }).select("_id");
        const classIds = enrolledClasses.map((c) => c._id);
        const homeworkList = await Homework_1.Homework.find({
            class: { $in: classIds },
            createdAt: { $gte: start, $lte: end },
        });
        const homeworkAssigned = homeworkList.length;
        const homeworkSubmitted = homeworkList.filter((hw) => hw.submissions.some((s) => s.student.toString() === studentId)).length;
        const progressRecords = await Progress_1.Progress.find({ student: studentId });
        const tajweedScore = progressRecords.length > 0
            ? Math.max(...progressRecords.map((p) => p.tajweedScore))
            : 0;
        const surahsCompleted = [
            ...new Set(progressRecords.flatMap((p) => p.surahsCompleted)),
        ];
        const teacherNote = progressRecords
            .map((p) => p.notes)
            .filter((note) => Boolean(note))
            .join(" ");
        const logStats = await (0, aiContextService_1.getStudentClassLogStats)(studentId, classIds, start, end);
        const monthlyNote = await (0, aiContextService_1.getLatestMonthlyProgressSummary)(studentId, classIds);
        const combinedTeacherNote = [
            teacherNote,
            monthlyNote,
            logStats.approved > 0
                ? `Verified sessions this week: ${logStats.approved}. Topics: ${logStats.recentTopics.join(", ") || "—"}`
                : "",
        ]
            .filter(Boolean)
            .join(" · ");
        const locale = (0, aiLocale_1.parseAiLocale)(req.body.locale);
        const summary = await (0, geminiService_1.generateParentWeeklySummary)({
            studentName: student.name,
            weekStart,
            weekEnd,
            totalClasses: Math.max(totalClasses, logStats.approved + logStats.pending),
            attendedClasses: Math.max(attendedClasses, logStats.approved),
            homeworkAssigned,
            homeworkSubmitted,
            tajweedScore,
            surahsCompleted,
            teacherNote: combinedTeacherNote,
            locale,
        });
        res.status(200).json({
            success: true,
            message: "Summary generated",
            data: {
                summary,
                studentName: student.name,
                locale,
                generatedAt: new Date(),
            },
        });
    }
    catch (error) {
        respondAiError(res, error, "generateParentSummary error", "Failed to generate parent summary");
    }
};
exports.generateParentSummary = generateParentSummary;
const getAtRiskStudents = async (req, res) => {
    try {
        const locale = (0, aiLocale_1.parseAiLocale)(req.query.locale);
        const cacheKey = `${req.user.role}:${req.user._id.toString()}:${locale}`;
        const cached = atRiskCache.get(cacheKey);
        if (cached && cached.expires > Date.now()) {
            res.status(200).json({
                success: true,
                message: "At-risk students fetched successfully",
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
            const warningData = {
                studentName: profile.student.name,
                missedClasses: profile.missedClasses,
                totalClasses: profile.totalClasses,
                homeworkMissed: profile.homeworkMissed,
                totalHomework: profile.totalHomework,
                tajweedScoreTrend: profile.tajweedScoreTrend,
                lastAttendanceDate: profile.lastAttendance
                    ? profile.lastAttendance.toLocaleDateString(locale === "en" ? "en-GB" : "bn-BD")
                    : locale === "en"
                        ? "No attendance recorded"
                        : "কোনো উপস্থিতি নেই",
                reasons: profile.reasons,
                locale,
            };
            const fallbackGuidance = (0, geminiService_1.buildFallbackEarlyWarning)(warningData);
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
                aiGuidance: fallbackGuidance,
                aiWarning: fallbackGuidance,
                aiGenerated: false,
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
            message: "At-risk students fetched successfully",
            data: results,
        });
    }
    catch (error) {
        respondAiError(res, error, "getAtRiskStudents error", "Failed to fetch at-risk students");
    }
};
exports.getAtRiskStudents = getAtRiskStudents;
const generateEarlyWarningHandler = async (req, res) => {
    try {
        const { studentId } = req.body;
        if (!studentId) {
            res.status(400).json({
                success: false,
                message: "Please provide studentId",
                data: null,
            });
            return;
        }
        if (!ensureGeminiKey(res))
            return;
        const locale = (0, aiLocale_1.parseAiLocale)(req.body.locale);
        const student = await getStudentWithAccess(req, res, studentId);
        if (!student)
            return;
        const classFilter = req.user.role === "teacher" ? { teacher: req.user._id } : {};
        const enrolledClasses = await Class_1.Class.find({
            students: studentId,
            ...classFilter,
        }).select("_id");
        const classIds = enrolledClasses.map((c) => c._id);
        const { start, end } = getLast30DaysRange();
        const attendanceRecords = await Attendance_1.Attendance.find({
            student: studentId,
            class: { $in: classIds },
            date: { $gte: start, $lte: end },
        }).sort({ date: -1 });
        const totalClasses = attendanceRecords.length;
        const missedClasses = attendanceRecords.filter((r) => r.status === "absent").length;
        const lastPresent = attendanceRecords.find((r) => r.status === "present" || r.status === "late");
        const homeworkList = await Homework_1.Homework.find({ class: { $in: classIds } });
        const totalHomework = homeworkList.length;
        const homeworkSubmitted = homeworkList.filter((hw) => hw.submissions.some((s) => s.student.toString() === studentId)).length;
        const progressRecords = await Progress_1.Progress.find({
            student: studentId,
            class: { $in: classIds },
        }).sort({ updatedAt: 1 });
        const tajweedScores = progressRecords.map((p) => p.tajweedScore);
        const reasons = [];
        if (missedClasses >= 3) {
            reasons.push(`Missed ${missedClasses} classes in the last 30 days`);
        }
        const submissionRate = totalHomework > 0 ? homeworkSubmitted / totalHomework : 1;
        if (totalHomework > 0 && submissionRate < 0.5) {
            reasons.push(`Homework submission rate below 50% (${homeworkSubmitted}/${totalHomework})`);
        }
        const minTajweed = tajweedScores.length > 0 ? Math.min(...tajweedScores) : 100;
        if (tajweedScores.length > 0 && minTajweed < 50) {
            reasons.push(`Tajweed score below 50 (${minTajweed}/100)`);
        }
        const warningData = {
            studentName: student.name,
            missedClasses,
            totalClasses,
            homeworkMissed: totalHomework - homeworkSubmitted,
            totalHomework,
            tajweedScoreTrend: buildTajweedTrend(tajweedScores),
            lastAttendanceDate: lastPresent?.date
                ? lastPresent.date.toLocaleDateString(locale === "en" ? "en-GB" : "bn-BD")
                : locale === "en"
                    ? "No attendance recorded"
                    : "কোনো উপস্থিতি নেই",
            reasons,
            locale,
        };
        let guidance;
        let aiGenerated = true;
        try {
            guidance = await (0, geminiService_1.generateEarlyWarning)(warningData);
        }
        catch (error) {
            if (!(error instanceof aiErrors_1.GeminiQuotaError))
                throw error;
            guidance = (0, geminiService_1.buildFallbackEarlyWarning)(warningData);
            aiGenerated = false;
        }
        res.status(200).json({
            success: true,
            message: aiGenerated
                ? "AI guidance generated"
                : "AI quota reached — showing template guidance",
            data: { guidance, locale, aiGenerated },
        });
    }
    catch (error) {
        respondAiError(res, error, "generateEarlyWarning error", "Failed to generate AI guidance");
    }
};
exports.generateEarlyWarningHandler = generateEarlyWarningHandler;
const generateProgressReport = async (req, res) => {
    try {
        const { studentId } = req.body;
        if (!studentId) {
            res.status(400).json({
                success: false,
                message: "Please provide studentId",
                data: null,
            });
            return;
        }
        if (!ensureGeminiKey(res))
            return;
        const student = await getStudentWithAccess(req, res, studentId);
        if (!student)
            return;
        const enrolledClasses = await Class_1.Class.find({ students: studentId }).select("title _id");
        const className = enrolledClasses.length > 0
            ? enrolledClasses.map((c) => c.title).join(", ")
            : "কোনো ক্লাস নেই";
        const progressRecords = await Progress_1.Progress.find({ student: studentId });
        const tajweedScore = progressRecords.length > 0
            ? Math.max(...progressRecords.map((p) => p.tajweedScore))
            : 0;
        const memorizedAyahs = progressRecords.length > 0
            ? Math.max(...progressRecords.map((p) => p.memorizedAyahs))
            : 0;
        const surahsCompleted = [
            ...new Set(progressRecords.flatMap((p) => p.surahsCompleted)),
        ];
        const teacherNotes = progressRecords
            .map((p) => p.notes)
            .filter((note) => Boolean(note))
            .join(" ");
        const attendanceRecords = await Attendance_1.Attendance.find({ student: studentId });
        const attendanceTotal = attendanceRecords.length;
        const attendancePresent = attendanceRecords.filter((r) => r.status === "present" || r.status === "late").length;
        const attendancePercentage = attendanceTotal > 0
            ? Math.round((attendancePresent / attendanceTotal) * 100)
            : 0;
        const classIds = enrolledClasses.map((c) => c._id);
        const homeworkList = await Homework_1.Homework.find({ class: { $in: classIds } });
        const homeworkTotal = homeworkList.length;
        const homeworkSubmitted = homeworkList.filter((hw) => hw.submissions.some((s) => s.student.toString() === studentId)).length;
        const homeworkCompletionRate = homeworkTotal > 0
            ? Math.round((homeworkSubmitted / homeworkTotal) * 100)
            : 0;
        const { start: monthStart, end: monthEnd } = getLast30DaysRange();
        const logStats = await (0, aiContextService_1.getStudentClassLogStats)(studentId, classIds, monthStart, monthEnd);
        const monthlyNote = await (0, aiContextService_1.getLatestMonthlyProgressSummary)(studentId, classIds);
        const enrichedNotes = [
            teacherNotes,
            monthlyNote,
            logStats.approved > 0
                ? `Verified sessions (30d): ${logStats.approved}. Recent topics: ${logStats.recentTopics.join(", ") || "—"}`
                : "",
            logStats.rejected > 0 ? `Rejected logs (30d): ${logStats.rejected}` : "",
        ]
            .filter(Boolean)
            .join(" · ");
        const locale = (0, aiLocale_1.parseAiLocale)(req.body.locale);
        const report = await (0, geminiService_1.generateProgressReport)({
            studentName: student.name,
            className,
            tajweedScore,
            memorizedAyahs,
            surahsCompleted,
            attendancePercentage,
            homeworkCompletionRate,
            teacherNotes: enrichedNotes,
            locale,
        });
        res.status(200).json({
            success: true,
            message: "Progress report generated",
            data: {
                report,
                studentName: student.name,
                locale,
                stats: {
                    tajweedScore,
                    memorizedAyahs,
                    attendancePercentage,
                    homeworkCompletionRate,
                    verifiedSessions: logStats.approved,
                    pendingLogs: logStats.pending,
                    rejectedLogs: logStats.rejected,
                },
                generatedAt: new Date(),
            },
        });
    }
    catch (error) {
        respondAiError(res, error, "generateProgressReport error", "Failed to generate progress report");
    }
};
exports.generateProgressReport = generateProgressReport;
const generateStudyPlan = async (req, res) => {
    try {
        const { studentId, targetGoal, availableDaysPerWeek, minutesPerDay } = req.body;
        if (!studentId ||
            !targetGoal ||
            availableDaysPerWeek === undefined ||
            minutesPerDay === undefined) {
            res.status(400).json({
                success: false,
                message: "Please provide studentId, targetGoal, availableDaysPerWeek, and minutesPerDay",
                data: null,
            });
            return;
        }
        if (!ensureGeminiKey(res))
            return;
        const student = await getStudentWithAccess(req, res, studentId, true);
        if (!student)
            return;
        const progressRecords = await Progress_1.Progress.find({ student: studentId });
        const tajweedScore = progressRecords.length > 0
            ? Math.max(...progressRecords.map((p) => p.tajweedScore))
            : 0;
        const surahsCompleted = [
            ...new Set(progressRecords.flatMap((p) => p.surahsCompleted)),
        ];
        const currentLevel = getCurrentLevel(tajweedScore);
        const locale = (0, aiLocale_1.parseAiLocale)(req.body.locale);
        const studyPlan = await (0, geminiService_1.generateStudyPlan)({
            studentName: student.name,
            currentLevel,
            surahsCompleted,
            tajweedScore,
            targetGoal,
            availableDaysPerWeek,
            minutesPerDay,
            locale,
        });
        res.status(200).json({
            success: true,
            message: "Study plan generated",
            data: {
                studyPlan,
                studentName: student.name,
                currentLevel,
                locale,
                generatedAt: new Date(),
            },
        });
    }
    catch (error) {
        respondAiError(res, error, "generateStudyPlan error", "Failed to generate study plan");
    }
};
exports.generateStudyPlan = generateStudyPlan;
const generateClassLogDraftHandler = async (req, res) => {
    try {
        const { sessionSlotId, sessionDate, topicsHint } = req.body;
        if (!sessionSlotId) {
            res.status(400).json({
                success: false,
                message: "sessionSlotId is required",
                data: null,
            });
            return;
        }
        if (!ensureGeminiKey(res))
            return;
        const slot = await SessionSlot_1.SessionSlot.findById(sessionSlotId)
            .populate("student", "name")
            .populate("class", "title")
            .lean();
        if (!slot || !slot.isActive) {
            res.status(404).json({
                success: false,
                message: "Session slot not found",
                data: null,
            });
            return;
        }
        if (req.user.role === "teacher" &&
            slot.teacher.toString() !== req.user._id.toString()) {
            res.status(403).json({
                success: false,
                message: "Access denied for this session",
                data: null,
            });
            return;
        }
        const student = slot.student;
        const classDoc = slot.class;
        const date = typeof sessionDate === "string" && sessionDate.trim()
            ? sessionDate.trim()
            : new Date().toISOString().split("T")[0];
        const recent = await (0, aiContextService_1.getRecentLogsForSlot)(sessionSlotId);
        const recentLogs = recent
            .map((l) => `[${l.sessionDate}] ${l.lessonReport}${l.topicsCovered?.length ? ` (topics: ${l.topicsCovered.join(", ")})` : ""}`)
            .join("\n");
        const draft = await (0, geminiService_1.generateClassLogDraft)({
            studentName: student.name ?? "Student",
            classTitle: classDoc.title ?? "Class",
            courseType: slot.courseType ?? classDoc.title ?? "Quran",
            sessionDate: date,
            durationMinutes: slot.durationMinutes ?? 60,
            topicsHint: typeof topicsHint === "string" ? topicsHint : "",
            recentLogs,
        });
        res.status(200).json({
            success: true,
            message: "Class log draft generated",
            data: { draft },
        });
    }
    catch (error) {
        respondAiError(res, error, "generateClassLogDraft error", "Failed to generate class log draft");
    }
};
exports.generateClassLogDraftHandler = generateClassLogDraftHandler;
