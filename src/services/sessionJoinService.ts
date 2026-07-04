import mongoose from "mongoose";
import { Attendance } from "../models/Attendance";
import { SessionJoin, type SessionJoinRole, type SessionJoinSource } from "../models/SessionJoin";
import { SessionSlot } from "../models/SessionSlot";
import { IUser } from "../models/User";
import { emitAdminLiveMonitorUpdate } from "../realtime/socketServer";
import { ACADEMY_TIMEZONE } from "../utils/scheduleUtils";

function getAcademyDateString(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ACADEMY_TIMEZONE,
  }).format(now);
}

function normalizeSessionDate(date?: string): string {
  if (date?.trim()) return date.trim();
  return getAcademyDateString();
}

export async function recordSessionJoin(input: {
  sessionSlotId: string;
  userId: string;
  role: SessionJoinRole;
  source?: SessionJoinSource;
  sessionDate?: string;
}): Promise<{ joinedAt: string; alreadyJoined: boolean }> {
  if (!mongoose.Types.ObjectId.isValid(input.sessionSlotId)) {
    throw new Error("Invalid session slot ID");
  }

  const slot = await SessionSlot.findById(input.sessionSlotId);
  if (!slot?.isActive) {
    throw new Error("Session slot not found");
  }

  const sessionDate = normalizeSessionDate(input.sessionDate);
  const source = input.source ?? "meeting_link";

  const existing = await SessionJoin.findOne({
    sessionSlot: slot._id,
    sessionDate,
    user: input.userId,
  });

  if (existing) {
    return {
      joinedAt: existing.joinedAt.toISOString(),
      alreadyJoined: true,
    };
  }

  const join = await SessionJoin.create({
    sessionSlot: slot._id,
    sessionDate,
    user: input.userId,
    role: input.role,
    source,
    joinedAt: new Date(),
  });

  await autoMarkAttendancePresent({
    classId: slot.class,
    studentId: slot.student,
    role: input.role,
    sessionDate,
  });

  emitAdminLiveMonitorUpdate();

  return {
    joinedAt: join.joinedAt.toISOString(),
    alreadyJoined: false,
  };
}

async function autoMarkAttendancePresent(input: {
  classId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  role: SessionJoinRole;
  sessionDate: string;
}): Promise<void> {
  if (input.role !== "student") return;

  const attendanceDate = new Date(`${input.sessionDate}T00:00:00.000Z`);

  await Attendance.findOneAndUpdate(
    {
      class: input.classId,
      student: input.studentId,
      date: attendanceDate,
    },
    {
      $setOnInsert: {
        class: input.classId,
        student: input.studentId,
        date: attendanceDate,
      },
      $set: {
        status: "present",
      },
    },
    { upsert: true, new: true }
  );
}

export async function getJoinMapForDate(
  sessionDate: string
): Promise<Map<string, { teacherJoinedAt?: string; studentJoinedAt?: string }>> {
  const joins = await SessionJoin.find({ sessionDate }).lean();
  const map = new Map<string, { teacherJoinedAt?: string; studentJoinedAt?: string }>();

  for (const join of joins) {
    const key = join.sessionSlot.toString();
    const entry = map.get(key) ?? {};
    const joinedAt = join.joinedAt.toISOString();
    if (join.role === "teacher") {
      entry.teacherJoinedAt = joinedAt;
    } else {
      entry.studentJoinedAt = joinedAt;
    }
    map.set(key, entry);
  }

  return map;
}

export function resolveJoinRoleForUser(
  slot: { teacher: mongoose.Types.ObjectId; student: mongoose.Types.ObjectId },
  user: Pick<IUser, "_id" | "role">
): SessionJoinRole | null {
  const userId = user._id.toString();
  if (slot.teacher.toString() === userId) return "teacher";
  if (slot.student.toString() === userId) return "student";
  if (user.role === "admin" || user.role === "super_admin") return null;
  return null;
}

export async function assertUserCanJoinSlot(
  sessionSlotId: string,
  user: Pick<IUser, "_id" | "role">
): Promise<{ slot: typeof SessionSlot.prototype; role: SessionJoinRole }> {
  const slot = await SessionSlot.findById(sessionSlotId);
  if (!slot?.isActive) {
    throw new Error("Session slot not found");
  }

  const role = resolveJoinRoleForUser(slot, user);
  if (!role) {
    throw new Error("You are not assigned to this session");
  }

  return { slot, role };
}
