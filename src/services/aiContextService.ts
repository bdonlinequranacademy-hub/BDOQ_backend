import type { Types } from "mongoose";
import mongoose from "mongoose";
import { Attendance } from "../models/Attendance";
import { ClassLog } from "../models/ClassLog";
import { Homework } from "../models/Homework";
import { MonthlyProgressSnapshot } from "../models/MonthlyProgressSnapshot";
import { Progress } from "../models/Progress";
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

export interface StudentRiskInputs {
  missedClasses: number;
  totalClasses: number;
  homeworkSubmitted: number;
  totalHomework: number;
  minTajweed: number;
  tajweedScores: number[];
  lastPresent: Date | null;
  logApproved: number;
  logRejected: number;
  weeklySlots: number;
}

export async function loadStudentRiskInputsBatch(
  studentIds: string[],
  studentClassMap: Map<string, Types.ObjectId[]>,
  start: Date,
  end: Date,
  teacherFilter: Record<string, unknown> = {}
): Promise<Map<string, StudentRiskInputs>> {
  const result = new Map<string, StudentRiskInputs>();
  if (studentIds.length === 0) return result;

  const studentOids = studentIds.map((id) => new mongoose.Types.ObjectId(id));
  const allClassIds = [
    ...new Set(
      [...studentClassMap.values()].flatMap((ids) => ids.map((id) => id.toString()))
    ),
  ].map((id) => new mongoose.Types.ObjectId(id));

  const startStr = start.toISOString().split("T")[0];
  const endStr = end.toISOString().split("T")[0];

  const [attendanceAgg, homeworkDocs, progressDocs, logAgg, slotAgg] =
    await Promise.all([
      Attendance.aggregate<{
        _id: Types.ObjectId;
        total: number;
        missed: number;
        lastPresent: Date | null;
      }>([
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
      Homework.find({ class: { $in: allClassIds } })
        .select("class submissions.student")
        .lean(),
      Progress.find({ student: { $in: studentOids } })
        .select("student tajweedScore updatedAt")
        .sort({ updatedAt: 1 })
        .lean(),
      ClassLog.aggregate<{
        _id: { student: Types.ObjectId; status: string };
        count: number;
      }>([
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
      SessionSlot.aggregate<{ _id: Types.ObjectId; count: number }>([
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

  const attendanceByStudent = new Map(
    attendanceAgg.map((row) => [row._id.toString(), row])
  );

  const progressByStudent = new Map<string, number[]>();
  for (const row of progressDocs) {
    const sid = row.student.toString();
    const scores = progressByStudent.get(sid) ?? [];
    scores.push(row.tajweedScore);
    progressByStudent.set(sid, scores);
  }

  const logStatsByStudent = new Map<string, { approved: number; rejected: number }>();
  for (const row of logAgg) {
    const sid = row._id.student.toString();
    const current = logStatsByStudent.get(sid) ?? { approved: 0, rejected: 0 };
    if (row._id.status === "approved") current.approved += row.count;
    if (row._id.status === "rejected") current.rejected += row.count;
    logStatsByStudent.set(sid, current);
  }

  const slotsByStudent = new Map(
    slotAgg.map((row) => [row._id.toString(), row.count])
  );

  const homeworkByClass = new Map<string, typeof homeworkDocs>();
  for (const hw of homeworkDocs) {
    const key = hw.class.toString();
    const list = homeworkByClass.get(key) ?? [];
    list.push(hw);
    homeworkByClass.set(key, list);
  }

  for (const studentId of studentIds) {
    const classIdSet = new Set(
      (studentClassMap.get(studentId) ?? []).map((id) => id.toString())
    );
    let totalHomework = 0;
    let homeworkSubmitted = 0;
    for (const classId of classIdSet) {
      for (const hw of homeworkByClass.get(classId) ?? []) {
        totalHomework += 1;
        if (
          hw.submissions?.some((s) => s.student.toString() === studentId)
        ) {
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
