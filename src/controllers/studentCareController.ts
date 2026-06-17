import { Request, Response } from "express";
import mongoose from "mongoose";
import { IUser } from "../models/User";
import { Class } from "../models/Class";
import { loadStudentRiskInputsBatch } from "../services/aiContextService";
import { buildSuggestedFollowUp } from "../services/studentCareService";

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

function buildTajweedTrend(scores: number[]): string {
  if (scores.length === 0) return "No record";
  if (scores.length === 1) return `${scores[0]}/100`;

  const latest = scores[scores.length - 1]!;
  const previous = scores[scores.length - 2]!;
  const direction =
    latest > previous ? "improving" : latest < previous ? "declining" : "stable";
  return `${latest}/100 (${direction}, previously ${previous})`;
}

export const getAtRiskStudents = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const cacheKey = `${req.user!.role}:${req.user!._id.toString()}`;
    const cached = atRiskCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      res.status(200).json({
        success: true,
        message: "Student care alerts fetched successfully",
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
        reasons.push(`Missed ${missedClasses} classes in the last 30 days`);
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
        reasons.push(`${logRejected} rejected session logs in the last 30 days`);
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
      const suggestedFollowUp = buildSuggestedFollowUp({
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
  } catch (error) {
    console.error("getAtRiskStudents error", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch student care alerts",
      data: null,
    });
  }
};
