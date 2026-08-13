import worldDialCodes from "./data/worldDialCodes.json";
import worldTimezones from "./data/worldTimezones.json";

type IDialRow = { iso: string; country: string; dialCode: string };
type ITzRow = { iso: string; value: string; country: string };

const timezoneByIso = new Map<string, string>();
for (const tz of worldTimezones as ITzRow[]) {
  if (!timezoneByIso.has(tz.iso)) {
    timezoneByIso.set(tz.iso, tz.value);
  }
}

const entries = (worldDialCodes as IDialRow[]).map((row) => ({
  name: row.country,
  dialCode: row.dialCode.replace(/\D/g, ""),
  timezone: timezoneByIso.get(row.iso) ?? "UTC",
}));

/** Country name → international dial code (no +). */
export const DIAL_CODE_BY_COUNTRY: Record<string, string> = Object.fromEntries(
  entries.map((entry) => [entry.name, entry.dialCode])
);
DIAL_CODE_BY_COUNTRY.UAE = DIAL_CODE_BY_COUNTRY["United Arab Emirates"] ?? "971";

export const COUNTRY_TIMEZONE_MAP: Record<string, string> = Object.fromEntries(
  entries.map((entry) => [entry.name, entry.timezone])
);
COUNTRY_TIMEZONE_MAP.UAE =
  COUNTRY_TIMEZONE_MAP["United Arab Emirates"] ?? "Asia/Dubai";

export const BD_TIMEZONE = "Asia/Dhaka";
export const DEFAULT_TIMEZONE = BD_TIMEZONE;

export function resolveTimezoneFromCountry(country: string): string {
  const trimmed = country.trim();
  return COUNTRY_TIMEZONE_MAP[trimmed] ?? DEFAULT_TIMEZONE;
}

function getTimezoneOffsetMs(timeZone: string, date: Date): number {
  const utc = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  const zoned = new Date(date.toLocaleString("en-US", { timeZone }));
  return zoned.getTime() - utc.getTime();
}

function zonedLocalToUtc(date: string, time: string, timeZone: string): Date {
  const local = new Date(`${date}T${time}:00`);
  return new Date(local.getTime() - getTimezoneOffsetMs(timeZone, local));
}

export function formatTrialLocalSchedule(
  date: string | undefined,
  time: string | undefined,
  timeZone: string | undefined
): string | null {
  if (!date?.trim() || !time?.trim()) return null;
  const tz = timeZone?.trim() || DEFAULT_TIMEZONE;
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  if (!year || !month || !day || Number.isNaN(hour) || Number.isNaN(minute)) {
    return `${date} ${time} (${tz})`;
  }
  const localLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(zonedLocalToUtc(date, time, tz));
  return `${localLabel} (${tz})`;
}

export function formatTrialBangladeshSchedule(
  date: string | undefined,
  time: string | undefined,
  sourceTimeZone: string | undefined
): string | null {
  if (!date?.trim() || !time?.trim()) return null;
  const sourceTz = sourceTimeZone?.trim() || DEFAULT_TIMEZONE;
  const utc = zonedLocalToUtc(date, time, sourceTz);
  const bdLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: BD_TIMEZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(utc);
  return `${bdLabel} (Bangladesh Time)`;
}
