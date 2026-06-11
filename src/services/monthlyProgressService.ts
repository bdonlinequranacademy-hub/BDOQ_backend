import type { Types } from "mongoose";
import { ClassLog } from "../models/ClassLog";
import {
  DEFAULT_MONTHLY_QUESTIONS,
  MonthlyProgressSnapshot,
} from "../models/MonthlyProgressSnapshot";
import { Progress } from "../models/Progress";
import { Class } from "../models/Class";

type PopulatedUser = {
  _id: Types.ObjectId;
  name: string;
  studentId?: string | null;
};

type PopulatedClass = {
  _id: Types.ObjectId;
  title: string;
};

export interface MonthlyProgressView {
  _id: string;
  month: string;
  student: {
    _id: string;
    name: string;
    studentId?: string;
  };
  class: {
    _id: string;
    title: string;
  };
  teacher: {
    _id: string;
    name: string;
  };
  surahsCompleted: string[];
  tajweedScore: number;
  memorizedAyahs: number;
  teacherSummary?: string;
  qaResponses: { question: string; answer: string }[];
  activityDates: string[];
  sessionsHeld: number;
  createdAt: string;
  updatedAt: string;
}

function formatSnapshot(doc: InstanceType<typeof MonthlyProgressSnapshot>): MonthlyProgressView {
  const student = doc.student as unknown as PopulatedUser;
  const teacher = doc.teacher as unknown as PopulatedUser;
  const classDoc = doc.class as unknown as PopulatedClass;

  return {
    _id: doc._id.toString(),
    month: doc.month,
    student: {
      _id: student._id.toString(),
      name: student.name,
      studentId: student.studentId ?? undefined,
    },
    class: {
      _id: classDoc._id.toString(),
      title: classDoc.title,
    },
    teacher: {
      _id: teacher._id.toString(),
      name: teacher.name,
    },
    surahsCompleted: doc.surahsCompleted,
    tajweedScore: doc.tajweedScore,
    memorizedAyahs: doc.memorizedAyahs,
    teacherSummary: doc.teacherSummary,
    qaResponses: doc.qaResponses,
    activityDates: doc.activityDates,
    sessionsHeld: doc.sessionsHeld,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

async function assertTeacherStudentClass(
  teacherId: Types.ObjectId,
  studentId: string,
  classId: string
) {
  const classDoc = await Class.findOne({
    _id: classId,
    teacher: teacherId,
    students: studentId,
  });
  if (!classDoc) {
    throw new Error("CLASS_ACCESS_DENIED");
  }
  return classDoc;
}

async function gatherMonthActivity(
  teacherId: Types.ObjectId,
  studentId: string,
  month: string
) {
  const logs = await ClassLog.find({
    teacher: teacherId,
    student: studentId,
    status: "approved",
    sessionDate: { $regex: `^${month}` },
  }).select("sessionDate");

  const dates = [...new Set(logs.map((l) => l.sessionDate))].sort();
  return { activityDates: dates, sessionsHeld: logs.length };
}

export function getDefaultMonthlyQuestions(): string[] {
  return [...DEFAULT_MONTHLY_QUESTIONS];
}

export async function upsertMonthlyProgress(input: {
  teacherId: Types.ObjectId;
  studentId: string;
  classId: string;
  month: string;
  teacherSummary?: string;
  qaResponses?: { question: string; answer: string }[];
}) {
  await assertTeacherStudentClass(input.teacherId, input.studentId, input.classId);

  const progress = await Progress.findOne({
    student: input.studentId,
    class: input.classId,
  });

  const activity = await gatherMonthActivity(
    input.teacherId,
    input.studentId,
    input.month
  );

  const qaResponses =
    input.qaResponses && input.qaResponses.length > 0
      ? input.qaResponses
      : DEFAULT_MONTHLY_QUESTIONS.map((question) => ({ question, answer: "" }));

  const doc = await MonthlyProgressSnapshot.findOneAndUpdate(
    {
      student: input.studentId,
      class: input.classId,
      month: input.month,
    },
    {
      teacher: input.teacherId,
      surahsCompleted: progress?.surahsCompleted ?? [],
      tajweedScore: progress?.tajweedScore ?? 0,
      memorizedAyahs: progress?.memorizedAyahs ?? 0,
      teacherSummary: input.teacherSummary?.trim() || progress?.notes || "",
      qaResponses,
      activityDates: activity.activityDates,
      sessionsHeld: activity.sessionsHeld,
      createdBy: input.teacherId,
    },
    { upsert: true, new: true, runValidators: true }
  )
    .populate("student", "name studentId")
    .populate("teacher", "name")
    .populate("class", "title");

  return formatSnapshot(doc);
}

export async function listTeacherMonthlyProgress(
  teacherId: Types.ObjectId,
  month?: string
) {
  const filter: Record<string, unknown> = { teacher: teacherId };
  if (month) filter.month = month;

  const docs = await MonthlyProgressSnapshot.find(filter)
    .populate("student", "name studentId")
    .populate("teacher", "name")
    .populate("class", "title")
    .sort({ month: -1, updatedAt: -1 });

  return docs.map(formatSnapshot);
}

export async function listStudentMonthlyProgress(
  studentId: Types.ObjectId,
  month?: string
) {
  const filter: Record<string, unknown> = { student: studentId };
  if (month) filter.month = month;

  const docs = await MonthlyProgressSnapshot.find(filter)
    .populate("student", "name studentId")
    .populate("teacher", "name")
    .populate("class", "title")
    .sort({ month: -1 });

  return docs.map(formatSnapshot);
}

export async function listAdminMonthlyProgress(month?: string) {
  const filter: Record<string, unknown> = {};
  if (month) filter.month = month;

  const docs = await MonthlyProgressSnapshot.find(filter)
    .populate("student", "name studentId")
    .populate("teacher", "name")
    .populate("class", "title")
    .sort({ month: -1, updatedAt: -1 });

  return docs.map(formatSnapshot);
}
