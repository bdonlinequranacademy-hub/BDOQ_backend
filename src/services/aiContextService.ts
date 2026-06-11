import type { Types } from "mongoose";
import { ClassLog } from "../models/ClassLog";
import { MonthlyProgressSnapshot } from "../models/MonthlyProgressSnapshot";
import { SessionSlot } from "../models/SessionSlot";

export interface ClassLogPeriodStats {
  approved: number;
  pending: number;
  rejected: number;
  recentTopics: string[];
  recentSummaries: string[];
}

export async function getStudentClassLogStats(
  studentId: string,
  classIds: Types.ObjectId[],
  start: Date,
  end: Date
): Promise<ClassLogPeriodStats> {
  const startStr = start.toISOString().split("T")[0];
  const endStr = end.toISOString().split("T")[0];

  const logs = await ClassLog.find({
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
    ...new Set(
      approved.flatMap((l) => l.topicsCovered ?? []).filter(Boolean)
    ),
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

export async function getLatestMonthlyProgressSummary(
  studentId: string,
  classIds: Types.ObjectId[]
): Promise<string> {
  const snapshot = await MonthlyProgressSnapshot.findOne({
    student: studentId,
    class: { $in: classIds },
  })
    .sort({ month: -1 })
    .select("teacherSummary qaResponses month")
    .lean();

  if (!snapshot) return "";

  const qa = (snapshot.qaResponses ?? [])
    .map((r) => `${r.question}: ${r.answer}`)
    .join("; ");

  return [snapshot.teacherSummary, qa].filter(Boolean).join(" · ");
}

export async function countExpectedWeeklySessions(
  studentId: string,
  teacherFilter: Record<string, unknown> = {}
): Promise<number> {
  return SessionSlot.countDocuments({
    student: studentId,
    isActive: true,
    ...teacherFilter,
  });
}

export async function getRecentLogsForSlot(
  sessionSlotId: string,
  limit = 3
): Promise<{ sessionDate: string; lessonReport: string; topicsCovered: string[] }[]> {
  return ClassLog.find({
    sessionSlot: sessionSlotId,
    status: "approved",
  })
    .sort({ sessionDate: -1 })
    .limit(limit)
    .select("sessionDate lessonReport topicsCovered")
    .lean();
}
