import { Request, Response } from "express";
import mongoose from "mongoose";
import { IUser, User } from "../models/User";
import { Class } from "../models/Class";
import { Attendance } from "../models/Attendance";
import { Homework } from "../models/Homework";
import { Progress } from "../models/Progress";
import {
  generateEarlyWarning,
  generateParentWeeklySummary,
  generateProgressReport as generateProgressReportText,
  generateStudyPlan as generateStudyPlanText,
  generateClassLogDraft,
  buildFallbackEarlyWarning,
  type EarlyWarningData,
} from "../services/ai/geminiService";
import { parseAiLocale } from "../services/ai/aiLocale";
import {
  aiErrorMessage,
  aiErrorStatus,
  GeminiQuotaError,
} from "../services/ai/aiErrors";
import {
  getLatestMonthlyProgressSummary,
  getRecentLogsForSlot,
  getStudentClassLogStats,
  countExpectedWeeklySessions,
  loadStudentRiskInputsBatch,
} from "../services/aiContextService";
import { SessionSlot } from "../models/SessionSlot";

type RiskLevel = "high" | "medium" | "low";

const AT_RISK_CACHE_TTL_MS = 5 * 60_000;
const atRiskCache = new Map<string, { expires: number; data: unknown[] }>();

interface StudentRiskProfile {
  student: IUser;
  missedClasses: number;
  totalClasses: number;
  homeworkMissed: number;
  totalHomework: number;
  tajweedScoreTrend: string;
  lastAttendance: Date | null;
  reasons: string[];
  riskLevel: RiskLevel;
  verifiedSessions: number;
  rejectedLogs: number;
}

const getLast30DaysRange = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const computeRiskLevel = (
  factorCount: number,
  missedClasses: number,
  hasAttendanceRisk: boolean
): RiskLevel => {
  if (factorCount >= 2) return "high";
  if (factorCount === 1 && hasAttendanceRisk && missedClasses === 3) {
    return "low";
  }
  return "medium";
};

const buildTajweedTrend = (
  scores: number[]
): string => {
  if (scores.length === 0) return "কোনো রেকর্ড নেই";
  if (scores.length === 1) return `${scores[0]}/100`;

  const latest = scores[scores.length - 1];
  const previous = scores[scores.length - 2];
  const direction =
    latest > previous ? "উন্নতি" : latest < previous ? "অবনতি" : "স্থির";
  return `${latest}/100 (${direction}, আগে ${previous})`;
};

const ensureGeminiKey = (res: Response): boolean => {
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

const respondAiError = (
  res: Response,
  error: unknown,
  logLabel: string,
  fallbackMessage: string
): void => {
  const errMessage =
    error instanceof Error ? error.message : "Unknown error";
  console.error(`${logLabel}:`, errMessage);

  res.status(aiErrorStatus(error)).json({
    success: false,
    message: aiErrorMessage(error, fallbackMessage),
    data:
      process.env.NODE_ENV === "development" ? { error: errMessage } : null,
  });
};

const getStudentWithAccess = async (
  req: Request,
  res: Response,
  studentId: string,
  allowSelf = false
): Promise<IUser | null> => {
  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    res.status(400).json({
      success: false,
      message: "Invalid student ID",
      data: null,
    });
    return null;
  }

  if (allowSelf && req.user!.role === "student") {
    if (req.user!._id.toString() !== studentId) {
      res.status(403).json({
        success: false,
        message: "You can only generate a study plan for yourself",
        data: null,
      });
      return null;
    }
  }

  const student = await User.findOne({ _id: studentId, role: "student" });

  if (!student) {
    res.status(404).json({
      success: false,
      message: "Student not found",
      data: null,
    });
    return null;
  }

  if (req.user!.role === "teacher") {
    const teachesStudent = await Class.exists({
      teacher: req.user!._id,
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

const getCurrentLevel = (tajweedScore: number): string => {
  if (tajweedScore >= 80) return "Advanced";
  if (tajweedScore >= 50) return "Intermediate";
  return "Beginner";
};

const parseDateRange = (weekStart: string, weekEnd: string) => {
  const start = new Date(weekStart);
  const end = new Date(weekEnd);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

export const generateParentSummary = async (
  req: Request,
  res: Response
): Promise<void> => {
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

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
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

    const student = await User.findOne({ _id: studentId, role: "student" });

    if (!student) {
      res.status(404).json({
        success: false,
        message: "Student not found",
        data: null,
      });
      return;
    }

    if (req.user!.role === "teacher") {
      const teachesStudent = await Class.exists({
        teacher: req.user!._id,
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

    if (req.user!.role === "student") {
      if (studentId !== req.user!._id.toString()) {
        res.status(403).json({
          success: false,
          message: "You can only generate a summary for your own account",
          data: null,
        });
        return;
      }
    }

    if (req.user!.role === "parent") {
      const parent = await User.findById(req.user!._id).select("children");
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

    const attendanceRecords = await Attendance.find({
      student: studentId,
      date: { $gte: start, $lte: end },
    });

    const totalClasses = attendanceRecords.length;
    const attendedClasses = attendanceRecords.filter(
      (r) => r.status === "present" || r.status === "late"
    ).length;

    const enrolledClasses = await Class.find({ students: studentId }).select(
      "_id"
    );
    const classIds = enrolledClasses.map((c) => c._id);

    const homeworkList = await Homework.find({
      class: { $in: classIds },
      createdAt: { $gte: start, $lte: end },
    });

    const homeworkAssigned = homeworkList.length;
    const homeworkSubmitted = homeworkList.filter((hw) =>
      hw.submissions.some((s) => s.student.toString() === studentId)
    ).length;

    const progressRecords = await Progress.find({ student: studentId });

    const tajweedScore =
      progressRecords.length > 0
        ? Math.max(...progressRecords.map((p) => p.tajweedScore))
        : 0;

    const surahsCompleted = [
      ...new Set(progressRecords.flatMap((p) => p.surahsCompleted)),
    ];

    const teacherNote = progressRecords
      .map((p) => p.notes)
      .filter((note): note is string => Boolean(note))
      .join(" ");

    const logStats = await getStudentClassLogStats(
      studentId,
      classIds,
      start,
      end
    );
    const monthlyNote = await getLatestMonthlyProgressSummary(studentId, classIds);

    const combinedTeacherNote = [
      teacherNote,
      monthlyNote,
      logStats.approved > 0
        ? `Verified sessions this week: ${logStats.approved}. Topics: ${logStats.recentTopics.join(", ") || "—"}`
        : "",
    ]
      .filter(Boolean)
      .join(" · ");

    const locale = parseAiLocale(req.body.locale);

    const summary = await generateParentWeeklySummary({
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
  } catch (error) {
    respondAiError(
      res,
      error,
      "generateParentSummary error",
      "Failed to generate parent summary"
    );
  }
};

export const getAtRiskStudents = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const locale = parseAiLocale(req.query.locale);
    const cacheKey = `${req.user!.role}:${req.user!._id.toString()}:${locale}`;
    const cached = atRiskCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      res.status(200).json({
        success: true,
        message: "At-risk students fetched successfully",
        data: cached.data,
      });
      return;
    }

    const classFilter =
      req.user!.role === "teacher" ? { teacher: req.user!._id } : {};

    const classes = await Class.find(classFilter)
      .select("students teacher")
      .populate("students", "name email role")
      .lean();

    const studentMap = new Map<string, IUser>();
    const studentClassMap = new Map<string, mongoose.Types.ObjectId[]>();

    for (const cls of classes) {
      for (const student of cls.students as unknown as (IUser | null)[]) {
        if (!student || student.role !== "student") continue;
        const studentId = student._id.toString();
        studentMap.set(studentId, student as IUser);
        const classIds = studentClassMap.get(studentId) ?? [];
        classIds.push(cls._id as mongoose.Types.ObjectId);
        studentClassMap.set(studentId, classIds);
      }
    }

    const { start, end } = getLast30DaysRange();
    const studentIds = [...studentMap.keys()];
    const teacherSlotFilter =
      req.user!.role === "teacher" ? { teacher: req.user!._id } : {};

    const riskInputs = await loadStudentRiskInputsBatch(
      studentIds,
      studentClassMap,
      start,
      end,
      teacherSlotFilter
    );

    const atRiskProfiles: StudentRiskProfile[] = [];

    for (const [studentId, student] of studentMap) {
      const inputs = riskInputs.get(studentId);
      if (!inputs) continue;

      const {
        missedClasses,
        totalClasses,
        homeworkSubmitted,
        totalHomework,
        minTajweed,
        tajweedScores,
        lastPresent,
        logApproved,
        logRejected,
        weeklySlots,
      } = inputs;

      const homeworkMissed = totalHomework - homeworkSubmitted;
      const submissionRate =
        totalHomework > 0 ? homeworkSubmitted / totalHomework : 1;

      const reasons: string[] = [];
      const hasAttendanceRisk = missedClasses >= 3;
      const hasHomeworkRisk = totalHomework > 0 && submissionRate < 0.5;
      const hasScoreRisk = tajweedScores.length > 0 && minTajweed < 50;
      const hasRejectedLogRisk = logRejected >= 2;
      const hasMissingLogRisk = weeklySlots > 0 && logApproved === 0;

      if (hasAttendanceRisk) {
        reasons.push(
          `Missed ${missedClasses} classes in the last 30 days`
        );
      }
      if (hasHomeworkRisk) {
        reasons.push(
          `Homework submission rate below 50% (${homeworkSubmitted}/${totalHomework})`
        );
      }
      if (hasScoreRisk) {
        reasons.push(`Tajweed score below 50 (${minTajweed}/100)`);
      }
      if (hasRejectedLogRisk) {
        reasons.push(
          `${logRejected} rejected session logs in the last 30 days`
        );
      }
      if (hasMissingLogRisk) {
        reasons.push(
          "No verified session logs in the last 30 days despite active schedule"
        );
      }

      const factorCount =
        (hasAttendanceRisk ? 1 : 0) +
        (hasHomeworkRisk ? 1 : 0) +
        (hasScoreRisk ? 1 : 0) +
        (hasRejectedLogRisk ? 1 : 0) +
        (hasMissingLogRisk ? 1 : 0);

      if (factorCount === 0) continue;

      const riskLevel = computeRiskLevel(
        factorCount,
        missedClasses,
        hasAttendanceRisk
      );

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
      const warningData: EarlyWarningData = {
        studentName: profile.student.name,
        missedClasses: profile.missedClasses,
        totalClasses: profile.totalClasses,
        homeworkMissed: profile.homeworkMissed,
        totalHomework: profile.totalHomework,
        tajweedScoreTrend: profile.tajweedScoreTrend,
        lastAttendanceDate: profile.lastAttendance
          ? profile.lastAttendance.toLocaleDateString(
              locale === "en" ? "en-GB" : "bn-BD"
            )
          : locale === "en"
            ? "No attendance recorded"
            : "কোনো উপস্থিতি নেই",
        reasons: profile.reasons,
        locale,
      };
      const fallbackGuidance = buildFallbackEarlyWarning(warningData);

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
  } catch (error) {
    respondAiError(
      res,
      error,
      "getAtRiskStudents error",
      "Failed to fetch at-risk students"
    );
  }
};

export const generateEarlyWarningHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
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

    if (!ensureGeminiKey(res)) return;

    const locale = parseAiLocale(req.body.locale);
    const student = await getStudentWithAccess(req, res, studentId);
    if (!student) return;

    const classFilter =
      req.user!.role === "teacher" ? { teacher: req.user!._id } : {};

    const enrolledClasses = await Class.find({
      students: studentId,
      ...classFilter,
    }).select("_id");
    const classIds = enrolledClasses.map((c) => c._id);

    const { start, end } = getLast30DaysRange();

    const attendanceRecords = await Attendance.find({
      student: studentId,
      class: { $in: classIds },
      date: { $gte: start, $lte: end },
    }).sort({ date: -1 });

    const totalClasses = attendanceRecords.length;
    const missedClasses = attendanceRecords.filter(
      (r) => r.status === "absent"
    ).length;

    const lastPresent = attendanceRecords.find(
      (r) => r.status === "present" || r.status === "late"
    );

    const homeworkList = await Homework.find({ class: { $in: classIds } });
    const totalHomework = homeworkList.length;
    const homeworkSubmitted = homeworkList.filter((hw) =>
      hw.submissions.some((s) => s.student.toString() === studentId)
    ).length;

    const progressRecords = await Progress.find({
      student: studentId,
      class: { $in: classIds },
    }).sort({ updatedAt: 1 });

    const tajweedScores = progressRecords.map((p) => p.tajweedScore);
    const reasons: string[] = [];

    if (missedClasses >= 3) {
      reasons.push(`Missed ${missedClasses} classes in the last 30 days`);
    }
    const submissionRate =
      totalHomework > 0 ? homeworkSubmitted / totalHomework : 1;
    if (totalHomework > 0 && submissionRate < 0.5) {
      reasons.push(
        `Homework submission rate below 50% (${homeworkSubmitted}/${totalHomework})`
      );
    }
    const minTajweed =
      tajweedScores.length > 0 ? Math.min(...tajweedScores) : 100;
    if (tajweedScores.length > 0 && minTajweed < 50) {
      reasons.push(`Tajweed score below 50 (${minTajweed}/100)`);
    }

    const warningData: EarlyWarningData = {
      studentName: student.name,
      missedClasses,
      totalClasses,
      homeworkMissed: totalHomework - homeworkSubmitted,
      totalHomework,
      tajweedScoreTrend: buildTajweedTrend(tajweedScores),
      lastAttendanceDate: lastPresent?.date
        ? lastPresent.date.toLocaleDateString(
            locale === "en" ? "en-GB" : "bn-BD"
          )
        : locale === "en"
          ? "No attendance recorded"
          : "কোনো উপস্থিতি নেই",
      reasons,
      locale,
    };

    let guidance: string;
    let aiGenerated = true;

    try {
      guidance = await generateEarlyWarning(warningData);
    } catch (error) {
      if (!(error instanceof GeminiQuotaError)) throw error;
      guidance = buildFallbackEarlyWarning(warningData);
      aiGenerated = false;
    }

    res.status(200).json({
      success: true,
      message: aiGenerated
        ? "AI guidance generated"
        : "AI quota reached — showing template guidance",
      data: { guidance, locale, aiGenerated },
    });
  } catch (error) {
    respondAiError(
      res,
      error,
      "generateEarlyWarning error",
      "Failed to generate AI guidance"
    );
  }
};

export const generateProgressReport = async (
  req: Request,
  res: Response
): Promise<void> => {
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

    if (!ensureGeminiKey(res)) return;

    const student = await getStudentWithAccess(req, res, studentId);
    if (!student) return;

    const enrolledClasses = await Class.find({ students: studentId }).select(
      "title _id"
    );
    const className =
      enrolledClasses.length > 0
        ? enrolledClasses.map((c) => c.title).join(", ")
        : "কোনো ক্লাস নেই";

    const progressRecords = await Progress.find({ student: studentId });
    const tajweedScore =
      progressRecords.length > 0
        ? Math.max(...progressRecords.map((p) => p.tajweedScore))
        : 0;
    const memorizedAyahs =
      progressRecords.length > 0
        ? Math.max(...progressRecords.map((p) => p.memorizedAyahs))
        : 0;
    const surahsCompleted = [
      ...new Set(progressRecords.flatMap((p) => p.surahsCompleted)),
    ];
    const teacherNotes = progressRecords
      .map((p) => p.notes)
      .filter((note): note is string => Boolean(note))
      .join(" ");

    const attendanceRecords = await Attendance.find({ student: studentId });
    const attendanceTotal = attendanceRecords.length;
    const attendancePresent = attendanceRecords.filter(
      (r) => r.status === "present" || r.status === "late"
    ).length;
    const attendancePercentage =
      attendanceTotal > 0
        ? Math.round((attendancePresent / attendanceTotal) * 100)
        : 0;

    const classIds = enrolledClasses.map((c) => c._id);
    const homeworkList = await Homework.find({ class: { $in: classIds } });
    const homeworkTotal = homeworkList.length;
    const homeworkSubmitted = homeworkList.filter((hw) =>
      hw.submissions.some((s) => s.student.toString() === studentId)
    ).length;
    const homeworkCompletionRate =
      homeworkTotal > 0
        ? Math.round((homeworkSubmitted / homeworkTotal) * 100)
        : 0;

    const { start: monthStart, end: monthEnd } = getLast30DaysRange();
    const logStats = await getStudentClassLogStats(
      studentId,
      classIds,
      monthStart,
      monthEnd
    );
    const monthlyNote = await getLatestMonthlyProgressSummary(studentId, classIds);

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

    const locale = parseAiLocale(req.body.locale);

    const report = await generateProgressReportText({
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
  } catch (error) {
    respondAiError(
      res,
      error,
      "generateProgressReport error",
      "Failed to generate progress report"
    );
  }
};

export const generateStudyPlan = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { studentId, targetGoal, availableDaysPerWeek, minutesPerDay } =
      req.body;

    if (
      !studentId ||
      !targetGoal ||
      availableDaysPerWeek === undefined ||
      minutesPerDay === undefined
    ) {
      res.status(400).json({
        success: false,
        message:
          "Please provide studentId, targetGoal, availableDaysPerWeek, and minutesPerDay",
        data: null,
      });
      return;
    }

    if (!ensureGeminiKey(res)) return;

    const student = await getStudentWithAccess(req, res, studentId, true);
    if (!student) return;

    const progressRecords = await Progress.find({ student: studentId });
    const tajweedScore =
      progressRecords.length > 0
        ? Math.max(...progressRecords.map((p) => p.tajweedScore))
        : 0;
    const surahsCompleted = [
      ...new Set(progressRecords.flatMap((p) => p.surahsCompleted)),
    ];
    const currentLevel = getCurrentLevel(tajweedScore);

    const locale = parseAiLocale(req.body.locale);

    const studyPlan = await generateStudyPlanText({
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
  } catch (error) {
    respondAiError(
      res,
      error,
      "generateStudyPlan error",
      "Failed to generate study plan"
    );
  }
};

export const generateClassLogDraftHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
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

    if (!ensureGeminiKey(res)) return;

    const slot = await SessionSlot.findById(sessionSlotId)
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

    if (
      req.user!.role === "teacher" &&
      slot.teacher.toString() !== req.user!._id.toString()
    ) {
      res.status(403).json({
        success: false,
        message: "Access denied for this session",
        data: null,
      });
      return;
    }

    const student = slot.student as { name?: string };
    const classDoc = slot.class as { title?: string };
    const date =
      typeof sessionDate === "string" && sessionDate.trim()
        ? sessionDate.trim()
        : new Date().toISOString().split("T")[0];

    const recent = await getRecentLogsForSlot(sessionSlotId);
    const recentLogs = recent
      .map(
        (l) =>
          `[${l.sessionDate}] ${l.lessonReport}${l.topicsCovered?.length ? ` (topics: ${l.topicsCovered.join(", ")})` : ""}`
      )
      .join("\n");

    const draft = await generateClassLogDraft({
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
  } catch (error) {
    respondAiError(
      res,
      error,
      "generateClassLogDraft error",
      "Failed to generate class log draft"
    );
  }
};
