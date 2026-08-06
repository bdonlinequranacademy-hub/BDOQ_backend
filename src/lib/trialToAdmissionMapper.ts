import type { ITrialBooking } from "../models/TrialBooking";
import { resolveTimezoneFromCountry } from "./countryTimezone";

function parsePreferredTime(time?: string): {
  preferredHour: string;
  preferredMinute: string;
  preferredPeriod: "AM" | "PM";
} {
  if (!time?.trim()) {
    return { preferredHour: "6", preferredMinute: "00", preferredPeriod: "PM" };
  }
  const [hourRaw, minuteRaw] = time.split(":");
  const hour24 = Number.parseInt(hourRaw ?? "18", 10);
  const minute = minuteRaw?.padStart(2, "0") ?? "00";
  if (Number.isNaN(hour24)) {
    return { preferredHour: "6", preferredMinute: "00", preferredPeriod: "PM" };
  }
  const period: "AM" | "PM" = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return {
    preferredHour: String(hour12),
    preferredMinute: minute,
    preferredPeriod: period,
  };
}

function ageToApproximateDob(age?: string): string {
  if (!age?.trim()) return "";
  if (age === "70+") {
    const year = new Date().getFullYear() - 70;
    return `${year}-01-01`;
  }
  const years = Number.parseInt(age, 10);
  if (Number.isNaN(years)) return "";
  const year = new Date().getFullYear() - years;
  return `${year}-01-01`;
}

function courseSlugToTopics(courseSlug?: string): string[] {
  const slug = courseSlug?.trim().toLowerCase() ?? "";
  if (slug.includes("hifz")) return ["hifz"];
  if (slug.includes("tajweed")) return ["tajweed", "quran-recitation"];
  if (slug.includes("noorani") || slug.includes("qaida")) {
    return ["quran-education", "quran-recitation"];
  }
  if (slug.includes("free")) return ["quran-education"];
  return ["quran-education", "quran-recitation"];
}

function nationalityFromCountry(country?: string): string {
  const value = country?.trim();
  if (!value) return "Bangladeshi";
  if (value === "Bangladesh") return "Bangladeshi";
  return value;
}

export interface ITrialAdmissionPrefillInput {
  booking: ITrialBooking;
  email: string;
  teacherName?: string;
}

export function buildAdmissionFormDataFromTrial(
  input: ITrialAdmissionPrefillInput
): Record<string, unknown> {
  const { booking, email, teacherName } = input;
  const studentName = booking.studentName?.trim() || booking.parentName;
  const country = booking.country?.trim() || "Bangladesh";
  const timezone = booking.timezone?.trim() || resolveTimezoneFromCountry(country);
  const timeParts = parsePreferredTime(booking.preferredTrialTime);
  const addressPlaceholder = `${country} (complete address in admission form)`;

  return {
    fullName: studentName,
    dateOfBirth: ageToApproximateDob(booking.age),
    nationality: nationalityFromCountry(country),
    gender: booking.learnerGender ?? "male",
    email,
    whatsapp: booking.whatsapp,
    guardianWhatsapp: booking.whatsapp,
    currentAddressLine1: addressPlaceholder,
    currentAddressLine2: "",
    currentState: country,
    currentCity: country,
    currentDistrict: country,
    currentPostalCode: "0000",
    currentCountry: country,
    sameAsCurrentAddress: true,
    permanentAddressLine1: addressPlaceholder,
    permanentAddressLine2: "",
    permanentState: country,
    permanentCity: country,
    permanentDistrict: country,
    permanentPostalCode: "0000",
    permanentCountry: country,
    quranReadingLevel: "not-started",
    teachingLanguage: country === "Bangladesh" ? "bengali" : "english",
    topicsOfInterest: courseSlugToTopics(booking.courseSlug),
    classType: "private",
    timezone,
    preferredHour: timeParts.preferredHour,
    preferredMinute: timeParts.preferredMinute,
    preferredPeriod: timeParts.preferredPeriod,
    devices: ["smartphone"],
    internetType: "wifi",
    packagePlan: "standard",
    paymentMethod: "bkash",
    parentName: booking.parentName,
    parentRelationship: "Parent/Guardian",
    parentWhatsapp: booking.whatsapp,
    parentEmail: email,
    referralSources: ["friend"],
    goals:
      booking.additionalNote?.trim() ||
      "Continue Quran learning after a successful free trial class at BD Online Quran Academy.",
    trialBookingId: booking._id.toString(),
    assignedTeacherSlug: booking.teacherSlug,
    assignedTeacherName: teacherName,
    meetingPlatform: booking.meetingPlatform,
    meetingLink: booking.meetingLink,
    courseSlug: booking.courseSlug,
    preferredTrialDate: booking.preferredTrialDate,
    preferredTrialTime: booking.preferredTrialTime,
    source: "trial-conversion",
  };
}
