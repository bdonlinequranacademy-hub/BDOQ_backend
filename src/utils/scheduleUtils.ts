import type { ScheduleDay } from "../models/Class";

export const ACADEMY_TIMEZONE =
  process.env.ACADEMY_TIMEZONE?.trim() || "Asia/Dhaka";

const DAY_INDEX: Record<ScheduleDay, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

const ORDERED_DAYS: ScheduleDay[] = [
  "Saturday",
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
];

export function getOrderedDays(): ScheduleDay[] {
  return ORDERED_DAYS;
}

export function getTodayScheduleDay(
  timeZone: string = ACADEMY_TIMEZONE
): ScheduleDay {
  const weekday = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    timeZone,
  }).format(new Date());
  return weekday as ScheduleDay;
}

function getDateForWeekday(day: ScheduleDay, timeZone: string): Date {
  const todayName = getTodayScheduleDay(timeZone);
  const todayIndex = DAY_INDEX[todayName];
  const targetIndex = DAY_INDEX[day];
  let diff = targetIndex - todayIndex;
  if (diff < 0) diff += 7;

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const dayNum = Number(parts.find((p) => p.type === "day")?.value);

  const base = new Date(Date.UTC(year, month - 1, dayNum + diff, 12, 0, 0));
  return base;
}

function getTimeZoneOffsetMinutes(timeZone: string, date: Date): number {
  const utc = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    0,
    0
  );
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(new Date(utc));
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  const tzAsUtc = Date.UTC(
    Number(parts.find((p) => p.type === "year")?.value),
    Number(parts.find((p) => p.type === "month")?.value) - 1,
    Number(parts.find((p) => p.type === "day")?.value),
    hour,
    minute,
    0,
    0
  );
  return (tzAsUtc - utc) / 60000;
}

export function formatWeeklyTime(
  day: ScheduleDay,
  time24: string,
  targetTimeZone: string,
  sourceTimeZone: string = ACADEMY_TIMEZONE
): string {
  const [hours, minutes] = time24.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return time24;

  const ref = getDateForWeekday(day, sourceTimeZone);
  const y = ref.getUTCFullYear();
  const mo = ref.getUTCMonth();
  const d = ref.getUTCDate();

  const utcGuess = Date.UTC(y, mo, d, hours, minutes, 0, 0);
  const sourceOffset = getTimeZoneOffsetMinutes(sourceTimeZone, new Date(utcGuess));
  const instant = new Date(utcGuess - sourceOffset * 60000);

  return instant.toLocaleTimeString("en-US", {
    timeZone: targetTimeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatDuration(minutes: number): string {
  return `${minutes}m`;
}

export type SessionPhase = "upcoming" | "live" | "completed";

export function getSessionInstant(
  day: ScheduleDay,
  time24: string,
  sourceTimeZone: string = ACADEMY_TIMEZONE
): Date | null {
  const [hours, minutes] = time24.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;

  const ref = getDateForWeekday(day, sourceTimeZone);
  const y = ref.getUTCFullYear();
  const mo = ref.getUTCMonth();
  const d = ref.getUTCDate();

  const utcGuess = Date.UTC(y, mo, d, hours, minutes, 0, 0);
  const sourceOffset = getTimeZoneOffsetMinutes(
    sourceTimeZone,
    new Date(utcGuess)
  );
  return new Date(utcGuess - sourceOffset * 60000);
}

export function getSessionPhase(
  startsAt: Date,
  durationMinutes: number,
  now: Date = new Date()
): SessionPhase {
  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);
  if (now < startsAt) return "upcoming";
  if (now < endsAt) return "live";
  return "completed";
}
