import type { Types } from "mongoose";
import { Class, IClass } from "../models/Class";
import { SessionSlot, ISessionSlot } from "../models/SessionSlot";
import { IUser } from "../models/User";
import {
  ACADEMY_TIMEZONE,
  formatDuration,
  formatWeeklyTime,
  getSessionInstant,
  getSessionPhase,
  getTodayScheduleDay,
  normalizeScheduleTime,
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

type SlotRefs = {
  student: Types.ObjectId;
  teacher: Types.ObjectId;
  class: Types.ObjectId;
};

const SLOT_POPULATE = [
  { path: "student", select: "name timezone country studentId" },
  { path: "teacher", select: "name timezone country" },
  { path: "class", select: "title meetingLink" },
] as const;

function snapshotSlotRefs(slot: { get: (key: string) => unknown }): SlotRefs {
  return {
    student: slot.get("student") as Types.ObjectId,
    teacher: slot.get("teacher") as Types.ObjectId,
    class: slot.get("class") as Types.ObjectId,
  };
}

function resolvePopulatedUser(
  ref: Types.ObjectId,
  populated: unknown,
  fallbackName: string
): PopulatedUser {
  const user = populated as PopulatedUser | null;
  if (user?._id) return user;
  return {
    _id: ref,
    name: fallbackName,
    timezone: "UTC",
  };
}

function resolvePopulatedClass(
  ref: Types.ObjectId,
  populated: unknown
): PopulatedClass {
  const classDoc = populated as PopulatedClass | null;
  if (classDoc?._id) return classDoc;
  return {
    _id: ref,
    title: "Deleted class",
  };
}

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
    student: unknown;
    teacher: unknown;
    class: unknown;
  },
  refs: SlotRefs
): FormattedSessionSlot {
  const student = resolvePopulatedUser(refs.student, slot.student, "Deleted student");
  const teacher = resolvePopulatedUser(refs.teacher, slot.teacher, "Deleted teacher");
  const classDoc = resolvePopulatedClass(refs.class, slot.class);
  const studentTz = student.timezone || "UTC";
  const teacherTz = teacher.timezone || ACADEMY_TIMEZONE;
  const day = slot.day as Parameters<typeof formatWeeklyTime>[0];
  const startTime = normalizeScheduleTime(slot.startTime) ?? slot.startTime;
  const startsAt = getSessionInstant(day, startTime);
  const safeStartsAt =
    startsAt ??
    getSessionInstant(day, "09:00") ??
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const endsAt = new Date(safeStartsAt.getTime() + slot.durationMinutes * 60_000);
  const sessionPhase = getSessionPhase(safeStartsAt, slot.durationMinutes);

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
        time: formatWeeklyTime(day, startTime, ACADEMY_TIMEZONE),
        timezone: ACADEMY_TIMEZONE,
      },
      teacher: {
        label: "Tea",
        time: formatWeeklyTime(day, startTime, teacherTz),
        timezone: teacherTz,
      },
      student: {
        label: "Stu",
        time: formatWeeklyTime(day, startTime, studentTz),
        timezone: studentTz,
      },
    },
    sessionPhase,
    startsAt: safeStartsAt.toISOString(),
    endsAt: endsAt.toISOString(),
  };
}

async function mapFormattedSlots(slots: ISessionSlot[]) {
  if (slots.length === 0) return [];
  const refs = slots.map(snapshotSlotRefs);
  await SessionSlot.populate(slots, [...SLOT_POPULATE]);
  return slots.map((slot, index) => formatSlot(slot, refs[index]!));
}

export async function migrateScheduleRepeatField(): Promise<void> {
  await Class.updateMany(
    { "schedule.repeatDaily": { $exists: true } },
    {
      $set: { "schedule.repeatWeekly": true },
      $unset: { "schedule.repeatDaily": "" },
    }
  );

  await Class.updateMany(
    {
      schedule: { $exists: true, $ne: null },
      "schedule.repeatWeekly": { $exists: false },
    },
    { $set: { "schedule.repeatWeekly": true } }
  );
}

export async function migrateSessionSlotIndexes(): Promise<void> {
  const collection = SessionSlot.collection;
  const indexes = await collection.indexes();
  const legacyUnique = indexes.find(
    (idx) =>
      idx.unique === true &&
      idx.key?.class === 1 &&
      idx.key?.student === 1 &&
      idx.key?.day === undefined
  );

  if (legacyUnique?.name) {
    await collection.dropIndex(legacyUnique.name);
    console.log(
      `[schedule] Dropped legacy SessionSlot index: ${legacyUnique.name}`
    );
  }

  await SessionSlot.syncIndexes();
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

  const slotTime =
    normalizeScheduleTime(classDoc.schedule.time) ?? classDoc.schedule.time;
  const durationMinutes = classDoc.schedule.duration || 60;
  const repeatWeekly = classDoc.schedule.repeatWeekly !== false;
  const targetDay = classDoc.schedule.day;

  for (const studentId of classDoc.students) {
    await SessionSlot.findOneAndUpdate(
      { class: classDoc._id, student: studentId, day: targetDay },
      {
        teacher: classDoc.teacher,
        day: targetDay,
        startTime: slotTime,
        durationMinutes,
        courseType: classDoc.title,
        repeatWeekly,
        isActive: true,
        ...(repeatWeekly ? {} : { sessionPhase: "upcoming" }),
      },
      { upsert: true, new: true }
    );

    await SessionSlot.updateMany(
      {
        class: classDoc._id,
        student: studentId,
        day: { $ne: targetDay },
      },
      { isActive: false }
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
  }).sort({ startTime: 1 });

  return mapFormattedSlots(slots);
}

export async function getTeacherWeeklyRoutine(teacherId: Types.ObjectId) {
  const slots = await SessionSlot.find({
    teacher: teacherId,
    isActive: true,
  }).sort({ day: 1, startTime: 1 });

  return mapFormattedSlots(slots);
}

export async function getStudentTodaySchedule(studentId: Types.ObjectId) {
  const today = getTodayScheduleDay();
  const slots = await SessionSlot.find({
    student: studentId,
    day: today,
    isActive: true,
  }).sort({ startTime: 1 });

  return mapFormattedSlots(slots);
}

export async function getAcademyWeeklyRoutine(teacherId?: Types.ObjectId) {
  const filter: Record<string, unknown> = { isActive: true };
  if (teacherId) {
    filter.teacher = teacherId;
  }

  const slots = await SessionSlot.find(filter).sort({ day: 1, startTime: 1 });

  return mapFormattedSlots(slots);
}

export async function resyncAllClasses(): Promise<number> {
  const classes = await Class.find({ isActive: true });
  for (const classDoc of classes) {
    await syncSlotsFromClass(classDoc);
  }
  return classes.length;
}
