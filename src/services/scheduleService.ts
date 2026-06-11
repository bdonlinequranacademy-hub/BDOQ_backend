import type { Types } from "mongoose";
import { Class, IClass } from "../models/Class";
import { SessionSlot } from "../models/SessionSlot";
import { IUser } from "../models/User";
import {
  ACADEMY_TIMEZONE,
  formatDuration,
  formatWeeklyTime,
  getSessionInstant,
  getSessionPhase,
  getTodayScheduleDay,
  type SessionPhase,
} from "../utils/scheduleUtils";

type PopulatedUser = Pick<IUser, "name" | "timezone" | "country" | "studentId"> & {
  _id: Types.ObjectId;
};

type PopulatedClass = {
  _id: Types.ObjectId;
  title: string;
  meetingLink?: string;
};

export interface FormattedSessionSlot {
  _id: string;
  classId: string;
  classTitle: string;
  courseType: string;
  durationMinutes: number;
  durationLabel: string;
  day: string;
  meetingLink?: string;
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
    country?: string;
    timezone: string;
  };
  times: {
    academy: { label: string; time: string; timezone: string };
    teacher: { label: string; time: string; timezone: string };
    student: { label: string; time: string; timezone: string };
  };
  sessionPhase: SessionPhase;
  startsAt: string;
  endsAt: string;
}

function formatSlot(
  slot: {
    _id: Types.ObjectId;
    day: string;
    startTime: string;
    durationMinutes: number;
    courseType: string;
  },
  student: PopulatedUser,
  teacher: PopulatedUser,
  classDoc: PopulatedClass
): FormattedSessionSlot {
  const studentTz = student.timezone || "UTC";
  const teacherTz = teacher.timezone || ACADEMY_TIMEZONE;
  const day = slot.day as Parameters<typeof formatWeeklyTime>[0];
  const startsAt = getSessionInstant(day, slot.startTime) ?? new Date();
  const endsAt = new Date(startsAt.getTime() + slot.durationMinutes * 60_000);
  const sessionPhase = getSessionPhase(startsAt, slot.durationMinutes);

  return {
    _id: slot._id.toString(),
    classId: classDoc._id.toString(),
    classTitle: classDoc.title,
    courseType: slot.courseType || classDoc.title,
    durationMinutes: slot.durationMinutes,
    durationLabel: formatDuration(slot.durationMinutes),
    day: slot.day,
    meetingLink: classDoc.meetingLink,
    student: {
      _id: student._id.toString(),
      name: student.name,
      studentId: student.studentId ?? undefined,
      country: student.country ?? undefined,
      timezone: studentTz,
    },
    teacher: {
      _id: teacher._id.toString(),
      name: teacher.name,
      country: teacher.country ?? undefined,
      timezone: teacherTz,
    },
    times: {
      academy: {
        label: "BD",
        time: formatWeeklyTime(day, slot.startTime, ACADEMY_TIMEZONE),
        timezone: ACADEMY_TIMEZONE,
      },
      teacher: {
        label: "Tea",
        time: formatWeeklyTime(day, slot.startTime, teacherTz),
        timezone: teacherTz,
      },
      student: {
        label: "Stu",
        time: formatWeeklyTime(day, slot.startTime, studentTz),
        timezone: studentTz,
      },
    },
    sessionPhase,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
  };
}

export async function syncSlotsFromClass(classDoc: IClass): Promise<void> {
  if (!classDoc.schedule || classDoc.isActive === false) {
    await SessionSlot.updateMany({ class: classDoc._id }, { isActive: false });
    return;
  }

  await SessionSlot.updateMany(
    { class: classDoc._id, student: { $nin: classDoc.students } },
    { isActive: false }
  );

  for (const studentId of classDoc.students) {
    await SessionSlot.findOneAndUpdate(
      { class: classDoc._id, student: studentId },
      {
        teacher: classDoc.teacher,
        day: classDoc.schedule.day,
        startTime: classDoc.schedule.time,
        durationMinutes: classDoc.schedule.duration || 60,
        courseType: classDoc.title,
        isActive: true,
      },
      { upsert: true, new: true }
    );
  }

  const { refreshSessionPhaseForClass } = await import("./sessionStatusService");
  await refreshSessionPhaseForClass(classDoc._id.toString()).catch(() => undefined);
}

export async function getTeacherTodaySchedule(teacherId: Types.ObjectId) {
  const today = getTodayScheduleDay();
  const slots = await SessionSlot.find({
    teacher: teacherId,
    day: today,
    isActive: true,
  })
    .populate("student", "name timezone country studentId")
    .populate("teacher", "name timezone country")
    .populate("class", "title meetingLink")
    .sort({ startTime: 1 });

  return slots.map((slot) =>
    formatSlot(
      slot,
      slot.student as unknown as PopulatedUser,
      slot.teacher as unknown as PopulatedUser,
      slot.class as unknown as PopulatedClass
    )
  );
}

export async function getTeacherWeeklyRoutine(teacherId: Types.ObjectId) {
  const slots = await SessionSlot.find({
    teacher: teacherId,
    isActive: true,
  })
    .populate("student", "name timezone country studentId")
    .populate("teacher", "name timezone country")
    .populate("class", "title meetingLink")
    .sort({ day: 1, startTime: 1 });

  return slots.map((slot) =>
    formatSlot(
      slot,
      slot.student as unknown as PopulatedUser,
      slot.teacher as unknown as PopulatedUser,
      slot.class as unknown as PopulatedClass
    )
  );
}

export async function getStudentTodaySchedule(studentId: Types.ObjectId) {
  const today = getTodayScheduleDay();
  const slots = await SessionSlot.find({
    student: studentId,
    day: today,
    isActive: true,
  })
    .populate("student", "name timezone country studentId")
    .populate("teacher", "name timezone country")
    .populate("class", "title meetingLink")
    .sort({ startTime: 1 });

  return slots.map((slot) =>
    formatSlot(
      slot,
      slot.student as unknown as PopulatedUser,
      slot.teacher as unknown as PopulatedUser,
      slot.class as unknown as PopulatedClass
    )
  );
}

export async function getAcademyWeeklyRoutine(teacherId?: Types.ObjectId) {
  const filter: Record<string, unknown> = { isActive: true };
  if (teacherId) {
    filter.teacher = teacherId;
  }

  const slots = await SessionSlot.find(filter)
    .populate("student", "name timezone country studentId")
    .populate("teacher", "name timezone country")
    .populate("class", "title meetingLink")
    .sort({ day: 1, startTime: 1 });

  return slots.map((slot) =>
    formatSlot(
      slot,
      slot.student as unknown as PopulatedUser,
      slot.teacher as unknown as PopulatedUser,
      slot.class as unknown as PopulatedClass
    )
  );
}

export async function resyncAllClasses(): Promise<number> {
  const classes = await Class.find({ isActive: true });
  for (const classDoc of classes) {
    await syncSlotsFromClass(classDoc);
  }
  return classes.length;
}
