export interface IPackageDefaults {
  classesPerWeek: number;
  durationMinutes: number;
  monthlyFeeBdt: number;
  monthlyFeeUsd: number;
}

const PACKAGE_DEFAULTS: Record<string, IPackageDefaults> = {
  basic: {
    classesPerWeek: 2,
    durationMinutes: 30,
    monthlyFeeBdt: 2000,
    monthlyFeeUsd: 25,
  },
  standard: {
    classesPerWeek: 3,
    durationMinutes: 40,
    monthlyFeeBdt: 3000,
    monthlyFeeUsd: 35,
  },
  advance: {
    classesPerWeek: 4,
    durationMinutes: 50,
    monthlyFeeBdt: 4000,
    monthlyFeeUsd: 45,
  },
  premium: {
    classesPerWeek: 5,
    durationMinutes: 60,
    monthlyFeeBdt: 5000,
    monthlyFeeUsd: 55,
  },
};

export function getPackageDefaults(plan?: string): IPackageDefaults {
  const key = plan?.trim().toLowerCase() ?? "";
  return PACKAGE_DEFAULTS[key] ?? PACKAGE_DEFAULTS.standard;
}

export function parseClassTimeParts(time?: string): {
  classTimeHour: string;
  classTimeMinute: string;
  classTimePeriod: "AM" | "PM";
} {
  if (!time?.trim()) {
    return { classTimeHour: "6", classTimeMinute: "00", classTimePeriod: "PM" };
  }

  const [hourRaw, minuteRaw] = time.split(":");
  const hour24 = Number.parseInt(hourRaw ?? "18", 10);
  const minute = minuteRaw?.padStart(2, "0") ?? "00";

  if (Number.isNaN(hour24)) {
    return { classTimeHour: "6", classTimeMinute: "00", classTimePeriod: "PM" };
  }

  const period: "AM" | "PM" = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;

  return {
    classTimeHour: String(hour12),
    classTimeMinute: minute,
    classTimePeriod: period,
  };
}

export function formatClassTime24(
  hour: string,
  minute: string,
  period: "AM" | "PM"
): string {
  const hour12 = Number.parseInt(hour, 10);
  const minuteValue = minute.padStart(2, "0");
  if (Number.isNaN(hour12)) return "18:00";

  let hour24 = hour12 % 12;
  if (period === "PM") hour24 += 12;
  if (period === "AM" && hour12 === 12) hour24 = 0;

  return `${String(hour24).padStart(2, "0")}:${minuteValue}`;
}
