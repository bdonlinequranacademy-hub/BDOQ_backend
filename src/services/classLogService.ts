import type { Types } from "mongoose";
import { Class } from "../models/Class";
import { ClassLog, IClassLog, ClassLogStatus } from "../models/ClassLog";
import { createUserNotification, notifyAdmins as notifyAdminsRealtime } from "./notificationService";
import { SessionSlot } from "../models/SessionSlot";
import { computeEarningsOnApproval } from "./earningsService";
import {
  ACADEMY_TIMEZONE,
  formatDuration,
  formatWeeklyTime,
} from "../utils/scheduleUtils";
import type { ScheduleDay } from "../models/Class";
import { resolveCurriculumLabels } from "./curriculumService";

type PopulatedUser = {
  _id: Types.ObjectId;
  name: string;
  timezone?: string;
  country?: string;
  studentId?: string | null;
};

type PopulatedClass = {
  _id: Types.ObjectId;
  title: string;
  meetingLink?: string;
};

export interface ClassLogView {
  _id: string;
  sessionSlotId: string;
  classId: string;
  classTitle: string;
  courseType: string;
  sessionDate: string;
  durationMinutes: number;
  durationLabel: string;
  lessonReport: string;
  topicsCovered: string[];
  curriculumProgram?: string;
  curriculumUnit?: string;
  curriculumTopic?: string;
  curriculumLabels?: { program?: string; unit?: string; topic?: string };
  status: ClassLogStatus;
  adminNote?: string;
  approvedAt?: string;
  earningsBdt?: number;
  createdAt: string;
  student: {
    _id: string;
    name: string;
    studentId?: string;
    country?: string;
    timezone: string;
  };
  teacher: {
    _id: string;
    name: string;
    timezone: string;
  };
  times: {
    academy: { label: string; time: string; timezone: string };
    teacher: { label: string; time: string; timezone: string };
    student: { label: string; time: string; timezone: string };
  };
}

function formatLog(
  log: IClassLog,
  student: PopulatedUser,
  teacher: PopulatedUser,
  classDoc: PopulatedClass
): ClassLogView {
  return {
    _id: log._id.toString(),
    sessionSlotId: log.sessionSlot.toString(),
    classId: classDoc._id.toString(),
    classTitle: classDoc.title,
    courseType: log.courseType,
    sessionDate: log.sessionDate,
    durationMinutes: log.durationMinutes,
    durationLabel: formatDuration(log.durationMinutes),
    lessonReport: log.lessonReport,
    topicsCovered: log.topicsCovered ?? [],
    curriculumProgram: log.curriculumProgram,
    curriculumUnit: log.curriculumUnit,
    curriculumTopic: log.curriculumTopic,
    curriculumLabels: resolveCurriculumLabels(
      log.curriculumProgram,
      log.curriculumUnit,
      log.curriculumTopic
    ),
    status: log.status,
    adminNote: log.adminNote,
    approvedAt: log.approvedAt?.toISOString(),
    earningsBdt: log.earningsBdt,
    createdAt: log.createdAt.toISOString(),
    student: {
      _id: student._id.toString(),
      name: student.name,
      studentId: student.studentId ?? undefined,
      country: student.country ?? undefined,
      timezone: student.timezone || "UTC",
    },
    teacher: {
      _id: teacher._id.toString(),
      name: teacher.name,
      timezone: teacher.timezone || ACADEMY_TIMEZONE,
    },
    times: {
      academy: {
        label: "BD",
        time: log.times.academy.time,
        timezone: log.times.academy.timezone,
      },
      teacher: {
        label: "Tea",
        time: log.times.teacher.time,
        timezone: log.times.teacher.timezone,
      },
      student: {
        label: "Stu",
        time: log.times.student.time,
        timezone: log.times.student.timezone,
      },
    },
  };
}

async function mapLogs(logs: IClassLog[]): Promise<ClassLogView[]> {
  return logs.map((log) =>
    formatLog(
      log,
      log.student as unknown as PopulatedUser,
      log.teacher as unknown as PopulatedUser,
      log.class as unknown as PopulatedClass
    )
  );
}

async function notifyAdmins(title: string, message: string): Promise<void> {
  await notifyAdminsRealtime(title, message, "class");
}

export async function createClassLog(input: {
  teacherId: Types.ObjectId;
  sessionSlotId: string;
  sessionDate: string;
  lessonReport: string;
  topicsCovered?: string[];
  curriculumProgram?: string;
  curriculumUnit?: string;
  curriculumTopic?: string;
}): Promise<ClassLogView> {
  const slot = await SessionSlot.findOne({
    _id: input.sessionSlotId,
    teacher: input.teacherId,
    isActive: true,
  })
    .populate("student", "name timezone country studentId")
    .populate("teacher", "name timezone")
    .populate("class", "title meetingLink");

  if (!slot) {
    throw new Error("SESSION_SLOT_NOT_FOUND");
  }

  const student = slot.student as unknown as PopulatedUser;
  const teacher = slot.teacher as unknown as PopulatedUser;
  const classDoc = slot.class as unknown as PopulatedClass;
  const day = slot.day as ScheduleDay;
  const studentTz = student.timezone || "UTC";
  const teacherTz = teacher.timezone || ACADEMY_TIMEZONE;

  const existing = await ClassLog.findOne({
    sessionSlot: slot._id,
    sessionDate: input.sessionDate,
  });
  if (existing) {
    throw new Error("LOG_ALREADY_EXISTS");
  }

  const log = await ClassLog.create({
    sessionSlot: slot._id,
    class: classDoc._id,
    teacher: input.teacherId,
    student: student._id,
    sessionDate: input.sessionDate,
    durationMinutes: slot.durationMinutes,
    courseType: slot.courseType || classDoc.title,
    lessonReport: input.lessonReport.trim(),
    topicsCovered: input.topicsCovered ?? [],
    curriculumProgram: input.curriculumProgram,
    curriculumUnit: input.curriculumUnit,
    curriculumTopic: input.curriculumTopic,
    status: "pending",
    times: {
      academy: {
        time: formatWeeklyTime(day, slot.startTime, ACADEMY_TIMEZONE),
        timezone: ACADEMY_TIMEZONE,
      },
      teacher: {
        time: formatWeeklyTime(day, slot.startTime, teacherTz),
        timezone: teacherTz,
      },
      student: {
        time: formatWeeklyTime(day, slot.startTime, studentTz),
        timezone: studentTz,
      },
    },
  });

  await notifyAdmins(
    "Class log pending approval",
    `${teacher.name} submitted a class log for ${student.name} (${input.sessionDate}).`
  );

  const populated = await ClassLog.findById(log._id)
    .populate("student", "name timezone country studentId")
    .populate("teacher", "name timezone")
    .populate("class", "title meetingLink");

  return formatLog(
    populated!,
    populated!.student as unknown as PopulatedUser,
    populated!.teacher as unknown as PopulatedUser,
    populated!.class as unknown as PopulatedClass
  );
}

export async function getTeacherClassLogs(
  teacherId: Types.ObjectId,
  status?: ClassLogStatus
): Promise<ClassLogView[]> {
  const filter: Record<string, unknown> = { teacher: teacherId };
  if (status) filter.status = status;

  const logs = await ClassLog.find(filter)
    .populate("student", "name timezone country studentId")
    .populate("teacher", "name timezone")
    .populate("class", "title meetingLink")
    .sort({ sessionDate: -1, createdAt: -1 });

  return mapLogs(logs);
}

export async function getTeacherClassLogById(
  teacherId: Types.ObjectId,
  logId: string
): Promise<ClassLogView | null> {
  const log = await ClassLog.findOne({ _id: logId, teacher: teacherId })
    .populate("student", "name timezone country studentId")
    .populate("teacher", "name timezone")
    .populate("class", "title meetingLink");

  if (!log) return null;
  return formatLog(
    log,
    log.student as unknown as PopulatedUser,
    log.teacher as unknown as PopulatedUser,
    log.class as unknown as PopulatedClass
  );
}

export async function getAdminClassLogs(
  status?: ClassLogStatus
): Promise<ClassLogView[]> {
  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;

  const logs = await ClassLog.find(filter)
    .populate("student", "name timezone country studentId")
    .populate("teacher", "name timezone")
    .populate("class", "title meetingLink")
    .sort({ createdAt: -1 });

  return mapLogs(logs);
}

export async function approveClassLog(
  logId: string,
  adminId: Types.ObjectId
): Promise<ClassLogView | null> {
  const existing = await ClassLog.findById(logId);
  if (!existing) return null;

  const earningsBdt = await computeEarningsOnApproval(existing.class);

  const log = await ClassLog.findByIdAndUpdate(
    logId,
    {
      status: "approved",
      approvedBy: adminId,
      approvedAt: new Date(),
      adminNote: undefined,
      earningsBdt,
    },
    { new: true }
  )
    .populate("student", "name timezone country studentId")
    .populate("teacher", "name timezone")
    .populate("class", "title meetingLink");

  if (!log) return null;

  await createUserNotification({
    userId: log.teacher,
    title: "Class log approved",
    message: `Your class log for ${(log.student as unknown as PopulatedUser).name} on ${log.sessionDate} was approved.`,
    type: "class",
  });

  return formatLog(
    log,
    log.student as unknown as PopulatedUser,
    log.teacher as unknown as PopulatedUser,
    log.class as unknown as PopulatedClass
  );
}

export async function rejectClassLog(
  logId: string,
  adminId: Types.ObjectId,
  adminNote?: string
): Promise<ClassLogView | null> {
  const log = await ClassLog.findByIdAndUpdate(
    logId,
    {
      status: "rejected",
      approvedBy: adminId,
      approvedAt: new Date(),
      adminNote: adminNote?.trim() || "Rejected by admin",
    },
    { new: true }
  )
    .populate("student", "name timezone country studentId")
    .populate("teacher", "name timezone")
    .populate("class", "title meetingLink");

  if (!log) return null;

  await createUserNotification({
    userId: log.teacher,
    title: "Class log rejected",
    message: `Your class log for ${(log.student as unknown as PopulatedUser).name} on ${log.sessionDate} needs revision.`,
    type: "class",
  });

  return formatLog(
    log,
    log.student as unknown as PopulatedUser,
    log.teacher as unknown as PopulatedUser,
    log.class as unknown as PopulatedClass
  );
}

export async function getTeacherLogStats(teacherId: Types.ObjectId) {
  const [pending, approved, rejected] = await Promise.all([
    ClassLog.countDocuments({ teacher: teacherId, status: "pending" }),
    ClassLog.countDocuments({ teacher: teacherId, status: "approved" }),
    ClassLog.countDocuments({ teacher: teacherId, status: "rejected" }),
  ]);
  return { pending, approved, rejected };
}
