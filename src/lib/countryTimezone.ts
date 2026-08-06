export const COUNTRY_TIMEZONE_MAP: Record<string, string> = {
  Bangladesh: "Asia/Dhaka",
  Australia: "Australia/Sydney",
  "United Kingdom": "Europe/London",
  "United States": "America/New_York",
  Canada: "America/Toronto",
  "Saudi Arabia": "Asia/Riyadh",
  UAE: "Asia/Dubai",
  Qatar: "Asia/Qatar",
  Malaysia: "Asia/Kuala_Lumpur",
  Japan: "Asia/Tokyo",
  Germany: "Europe/Berlin",
  Pakistan: "Asia/Karachi",
  Indonesia: "Asia/Jakarta",
  Turkey: "Europe/Istanbul",
  Egypt: "Africa/Cairo",
  India: "Asia/Kolkata",
  Singapore: "Asia/Singapore",
  "New Zealand": "Pacific/Auckland",
  Mexico: "America/Mexico_City",
  France: "Europe/Paris",
};

export const BD_TIMEZONE = "Asia/Dhaka";
export const DEFAULT_TIMEZONE = COUNTRY_TIMEZONE_MAP.Bangladesh;

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
  const localLabel = new Intl.DateTimeFormat("en-GB", {
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
  const bdLabel = new Intl.DateTimeFormat("en-GB", {
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
