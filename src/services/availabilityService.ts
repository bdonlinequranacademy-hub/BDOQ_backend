import type { Types } from "mongoose";
import type { ScheduleDay } from "../models/Class";
import { SessionSlot } from "../models/SessionSlot";
import { User } from "../models/User";
import { ACADEMY_TIMEZONE, formatWeeklyTime } from "../utils/scheduleUtils";

export interface AvailabilityConflict {
  slotId: string;
  studentName: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
}

export interface AvailabilityCheckResult {
  available: boolean;
  day: ScheduleDay;
  startTime: string;
  durationMinutes: number;
  timezone: string;
  displayTime: {
    academy: string;
    teacher: string;
  };
  conflicts: AvailabilityConflict[];
}

const VALID_DAYS: ScheduleDay[] = [
  "Saturday",
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
];

function parseTimeToMinutes(timeStr: string): number | null {
  const cleaned = timeStr.split(/[–—-]/)[0].trim();
  const match = cleaned.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function minutesToTime24(total: number): string {
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function rangesOverlap(
  startA: number,
  endA: number,
  startB: number,
  endB: number
): boolean {
  return startA < endB && startB < endA;
}

export async function checkTeacherAvailability(
  teacherId: Types.ObjectId,
  day: ScheduleDay,
  startTime: string,
  durationMinutes: number
): Promise<AvailabilityCheckResult> {
  if (!VALID_DAYS.includes(day)) {
    throw new Error("INVALID_DAY");
  }

  const startMinutes = parseTimeToMinutes(startTime);
  if (startMinutes === null || durationMinutes < 15) {
    throw new Error("INVALID_TIME");
  }

  const endMinutes = startMinutes + durationMinutes;
  if (endMinutes > 24 * 60) {
    throw new Error("INVALID_TIME");
  }

  const teacher = await User.findById(teacherId).select("timezone name");
  const teacherTz = teacher?.timezone || ACADEMY_TIMEZONE;

  const slots = await SessionSlot.find({
    teacher: teacherId,
    day,
    isActive: true,
  }).populate("student", "name");

  const conflicts: AvailabilityConflict[] = [];

  for (const slot of slots) {
    const slotStart = parseTimeToMinutes(slot.startTime);
    if (slotStart === null) continue;
    const slotEnd = slotStart + slot.durationMinutes;

    if (rangesOverlap(startMinutes, endMinutes, slotStart, slotEnd)) {
      const student = slot.student as { name?: string };
      conflicts.push({
        slotId: slot._id.toString(),
        studentName: student.name ?? "Student",
        startTime: slot.startTime,
        endTime: minutesToTime24(slotEnd),
        durationMinutes: slot.durationMinutes,
      });
    }
  }

  const time24 = minutesToTime24(startMinutes);

  return {
    available: conflicts.length === 0,
    day,
    startTime: time24,
    durationMinutes,
    timezone: ACADEMY_TIMEZONE,
    displayTime: {
      academy: formatWeeklyTime(day, time24, ACADEMY_TIMEZONE),
      teacher: formatWeeklyTime(day, time24, teacherTz),
    },
    conflicts,
  };
}
