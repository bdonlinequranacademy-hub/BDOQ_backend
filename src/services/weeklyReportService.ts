import type { Types } from "mongoose";
import { Attendance } from "../models/Attendance";
import { Class } from "../models/Class";
import { Homework } from "../models/Homework";
import { User } from "../models/User";
import { getStudentClassLogStats } from "./aiContextService";

export interface WeeklyFamilyReportView {
  studentName: string;
  teacherName: string;
  weekStart: string;
  weekEnd: string;
  weekLabel: string;
  sessionsHeld: number;
  topicsCovered: string[];
  sessionHighlights: string[];
  attendance: {
    present: number;
    absent: number;
    late: number;
    total: number;
  };
  homework: {
    assigned: number;
    submitted: number;
    graded: number;
    missingTitles: string[];
  };
  text: string;
  generatedAt: string;
}

function parseWeekRange(weekStart?: string, weekEnd?: string) {
  const now = new Date();
  const start = weekStart ? new Date(weekStart) : new Date(now);
  if (!weekStart) {
    start.setDate(now.getDate() - now.getDay());
  }
  start.setHours(0, 0, 0, 0);

  const end = weekEnd ? new Date(weekEnd) : new Date(start);
  if (!weekEnd) {
    end.setDate(start.getDate() + 6);
  }
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function formatWeekLabel(start: Date, end: Date) {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${start.toLocaleDateString("en-US", opts)} – ${end.toLocaleDateString("en-US", opts)}`;
}

async function getSharedClassIds(
  teacherId: Types.ObjectId,
  studentId: string
): Promise<Types.ObjectId[]> {
  const classes = await Class.find({
    teacher: teacherId,
    students: studentId,
    isActive: true,
  }).select("_id");
  return classes.map((c) => c._id);
}

async function gatherHomeworkStats(
  studentId: string,
  classIds: Types.ObjectId[],
  start: Date,
  end: Date
) {
  const homework = await Homework.find({
    class: { $in: classIds },
    dueDate: { $gte: start, $lte: end },
  }).select("title dueDate submissions");

  let assigned = 0;
  let submitted = 0;
  let graded = 0;
  const missingTitles: string[] = [];

  for (const hw of homework) {
    assigned++;
    const sub = hw.submissions.find((s) => s.student.toString() === studentId);
    if (sub?.submittedAt) {
      submitted++;
      if (sub.grade) graded++;
    } else {
      missingTitles.push(hw.title);
    }
  }

  return { assigned, submitted, graded, missingTitles };
}

async function gatherAttendanceStats(
  studentId: string,
  classIds: Types.ObjectId[],
  start: Date,
  end: Date
) {
  const records = await Attendance.find({
    student: studentId,
    class: { $in: classIds },
    date: { $gte: start, $lte: end },
  });

  let present = 0;
  let absent = 0;
  let late = 0;

  for (const record of records) {
    if (record.status === "present") present++;
    else if (record.status === "absent") absent++;
    else if (record.status === "late") late++;
  }

  return {
    present,
    absent,
    late,
    total: records.length,
  };
}

function buildReportText(input: {
  studentName: string;
  teacherName: string;
  weekLabel: string;
  sessionsHeld: number;
  topicsCovered: string[];
  sessionHighlights: string[];
  attendance: WeeklyFamilyReportView["attendance"];
  homework: WeeklyFamilyReportView["homework"];
}): string {
  const topics =
    input.topicsCovered.length > 0
      ? input.topicsCovered.join(", ")
      : "None logged this week.";
  const highlights =
    input.sessionHighlights.length > 0
      ? input.sessionHighlights
          .map((h, i) => `${i + 1}. ${h.replace(/\s+/g, " ").trim()}`)
          .join("\n")
      : "No approved session notes for this week.";
  const missing =
    input.homework.missingTitles.length > 0
      ? input.homework.missingTitles.join(", ")
      : "None — all assigned work submitted.";

  return `Assalamu Alaikum,

Weekly progress update — ${input.studentName}
Week: ${input.weekLabel}
Prepared by: ${input.teacherName}, BD Online Quran Academy

VERIFIED SESSIONS (admin-approved class logs): ${input.sessionsHeld}

Topics from approved logs:
${topics}

Session notes (from approved logs):
${highlights}

Attendance this week: ${input.attendance.present} present · ${input.attendance.late} late · ${input.attendance.absent} absent (${input.attendance.total} sessions marked)

Homework: ${input.homework.submitted} of ${input.homework.assigned} submitted · ${input.homework.graded} graded
Still pending: ${missing}

---
This message is built only from portal records (approved logs, attendance, homework). It is not AI-generated.

JazakAllahu Khair.`;
}

export async function buildTeacherWeeklyReport(input: {
  teacherId: Types.ObjectId;
  studentId: string;
  weekStart?: string;
  weekEnd?: string;
}): Promise<WeeklyFamilyReportView> {
  const classIds = await getSharedClassIds(input.teacherId, input.studentId);
  if (classIds.length === 0) {
    throw new Error("STUDENT_ACCESS_DENIED");
  }

  const [student, teacher] = await Promise.all([
    User.findById(input.studentId).select("name"),
    User.findById(input.teacherId).select("name"),
  ]);

  if (!student || !teacher) {
    throw new Error("USER_NOT_FOUND");
  }

  const { start, end } = parseWeekRange(input.weekStart, input.weekEnd);
  const logStats = await getStudentClassLogStats(
    input.studentId,
    classIds,
    start,
    end
  );
  const [attendance, homework] = await Promise.all([
    gatherAttendanceStats(input.studentId, classIds, start, end),
    gatherHomeworkStats(input.studentId, classIds, start, end),
  ]);

  const weekLabel = formatWeekLabel(start, end);
  const text = buildReportText({
    studentName: student.name,
    teacherName: teacher.name,
    weekLabel,
    sessionsHeld: logStats.approved,
    topicsCovered: logStats.recentTopics,
    sessionHighlights: logStats.recentSummaries,
    attendance,
    homework,
  });

  return {
    studentName: student.name,
    teacherName: teacher.name,
    weekStart: start.toISOString().split("T")[0],
    weekEnd: end.toISOString().split("T")[0],
    weekLabel,
    sessionsHeld: logStats.approved,
    topicsCovered: logStats.recentTopics,
    sessionHighlights: logStats.recentSummaries,
    attendance,
    homework,
    text,
    generatedAt: new Date().toISOString(),
  };
}

export async function buildStudentWeeklyReport(input: {
  studentId: Types.ObjectId;
  weekStart?: string;
  weekEnd?: string;
}): Promise<WeeklyFamilyReportView> {
  const classes = await Class.find({
    students: input.studentId,
    isActive: true,
  })
    .populate("teacher", "name")
    .select("teacher");

  if (classes.length === 0) {
    throw new Error("NO_CLASSES");
  }

  const classIds = classes.map((c) => c._id);
  const primaryTeacher = classes[0].teacher as unknown as { name: string };
  const student = await User.findById(input.studentId).select("name");
  if (!student) {
    throw new Error("USER_NOT_FOUND");
  }

  const { start, end } = parseWeekRange(input.weekStart, input.weekEnd);
  const logStats = await getStudentClassLogStats(
    input.studentId.toString(),
    classIds,
    start,
    end
  );
  const [attendance, homework] = await Promise.all([
    gatherAttendanceStats(input.studentId.toString(), classIds, start, end),
    gatherHomeworkStats(input.studentId.toString(), classIds, start, end),
  ]);

  const weekLabel = formatWeekLabel(start, end);
  const text = buildReportText({
    studentName: student.name,
    teacherName: primaryTeacher?.name ?? "Your teacher",
    weekLabel,
    sessionsHeld: logStats.approved,
    topicsCovered: logStats.recentTopics,
    sessionHighlights: logStats.recentSummaries,
    attendance,
    homework,
  });

  return {
    studentName: student.name,
    teacherName: primaryTeacher?.name ?? "Your teacher",
    weekStart: start.toISOString().split("T")[0],
    weekEnd: end.toISOString().split("T")[0],
    weekLabel,
    sessionsHeld: logStats.approved,
    topicsCovered: logStats.recentTopics,
    sessionHighlights: logStats.recentSummaries,
    attendance,
    homework,
    text,
    generatedAt: new Date().toISOString(),
  };
}
