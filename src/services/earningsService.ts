import type { Types } from "mongoose";
import { Class } from "../models/Class";
import { ClassLog, ClassLogStatus } from "../models/ClassLog";

const DEFAULT_SESSION_RATE_BDT = 500;

export interface EarningsSessionRow {
  logId: string;
  sessionDate: string;
  studentName: string;
  studentId?: string;
  classTitle: string;
  courseType: string;
  durationMinutes: number;
  earningsBdt: number;
  status: ClassLogStatus;
}

export interface EarningsCourseBreakdown {
  courseType: string;
  sessions: number;
  totalBdt: number;
}

export interface TeacherEarningsSummary {
  month: string;
  totalBdt: number;
  verifiedSessions: number;
  pendingSessions: number;
  pendingBdt: number;
  rejectedSessions: number;
  byCourse: EarningsCourseBreakdown[];
  sessions: EarningsSessionRow[];
}

export interface AdminTeacherEarningsRow {
  teacherId: string;
  teacherName: string;
  verifiedSessions: number;
  pendingSessions: number;
  totalBdt: number;
  pendingBdt: number;
}

export interface AdminEarningsOverview {
  month: string;
  totalBdt: number;
  verifiedSessions: number;
  pendingSessions: number;
  teachers: AdminTeacherEarningsRow[];
}

function monthPrefix(month: string): string {
  return month;
}

async function resolveRate(classId: Types.ObjectId): Promise<number> {
  const classDoc = await Class.findById(classId).select("sessionRateBdt");
  return classDoc?.sessionRateBdt ?? DEFAULT_SESSION_RATE_BDT;
}

function earningsForLog(
  log: {
    earningsBdt?: number;
    status: ClassLogStatus;
    class: Types.ObjectId;
  },
  rate: number
): number {
  if (log.status === "approved") {
    return log.earningsBdt ?? rate;
  }
  if (log.status === "pending") {
    return rate;
  }
  return 0;
}

export async function getTeacherEarnings(
  teacherId: Types.ObjectId,
  month: string
): Promise<TeacherEarningsSummary> {
  const prefix = monthPrefix(month);
  const logs = await ClassLog.find({
    teacher: teacherId,
    sessionDate: { $regex: `^${prefix}` },
  })
    .populate("student", "name studentId")
    .populate("class", "title sessionRateBdt")
    .sort({ sessionDate: -1 });

  const rateCache = new Map<string, number>();
  const byCourseMap = new Map<string, EarningsCourseBreakdown>();
  const sessions: EarningsSessionRow[] = [];

  let totalBdt = 0;
  let verifiedSessions = 0;
  let pendingSessions = 0;
  let pendingBdt = 0;
  let rejectedSessions = 0;

  for (const log of logs) {
    const populatedClass = log.class as {
      _id?: Types.ObjectId;
      sessionRateBdt?: number;
      title?: string;
    };
    const classId =
      populatedClass._id?.toString() ??
      (log.class as Types.ObjectId).toString();
    let rate = rateCache.get(classId);
    if (rate === undefined) {
      rate =
        populatedClass.sessionRateBdt ??
        (await resolveRate(log.class as Types.ObjectId));
      rateCache.set(classId, rate);
    }

    const amount = earningsForLog(log, rate);
    const student = log.student as { name?: string; studentId?: string };

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
    } else if (log.status === "pending") {
      pendingSessions += 1;
      pendingBdt += rate;
    } else {
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

export async function getAdminEarningsOverview(
  month: string
): Promise<AdminEarningsOverview> {
  const prefix = monthPrefix(month);
  const logs = await ClassLog.find({
    sessionDate: { $regex: `^${prefix}` },
  })
    .populate("teacher", "name")
    .populate("class", "sessionRateBdt");

  const teacherMap = new Map<string, AdminTeacherEarningsRow>();
  let totalBdt = 0;
  let verifiedSessions = 0;
  let pendingSessions = 0;

  for (const log of logs) {
    const teacher = log.teacher as { _id: Types.ObjectId; name?: string };
    const teacherId = teacher._id.toString();
    const rate =
      (log.class as { sessionRateBdt?: number }).sessionRateBdt ?? DEFAULT_SESSION_RATE_BDT;

    const row =
      teacherMap.get(teacherId) ??
      ({
        teacherId,
        teacherName: teacher.name ?? "Teacher",
        verifiedSessions: 0,
        pendingSessions: 0,
        totalBdt: 0,
        pendingBdt: 0,
      } satisfies AdminTeacherEarningsRow);

    if (log.status === "approved") {
      const amount = log.earningsBdt ?? rate;
      row.verifiedSessions += 1;
      row.totalBdt += amount;
      totalBdt += amount;
      verifiedSessions += 1;
    } else if (log.status === "pending") {
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

export async function computeEarningsOnApproval(
  classId: Types.ObjectId
): Promise<number> {
  return resolveRate(classId);
}
