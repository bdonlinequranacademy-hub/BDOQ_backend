import { TrialBooking, type ITrialBooking, type TrialBookingStatus } from "../models/TrialBooking";
import { sendEmail } from "./emailService";

export type { TrialBookingStatus };

export interface CreateTrialBookingInput {
  parentName: string;
  email: string;
  whatsapp: string;
  learnerType: "child" | "teen" | "adult";
  timeSlot?: "morning" | "afternoon" | "evening";
  teacherPreference?: "any" | "female" | "male";
  preferredDays?: string[];
  timezone?: string;
  source?: string;
  courseSlug?: string;
  teacherSlug?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function notifyEmail(): string | null {
  const to =
    process.env.TRIAL_NOTIFY_EMAIL?.trim() ||
    process.env.FROM_EMAIL?.trim() ||
    process.env.TEST_EMAIL_TO?.trim();
  return to || null;
}

function formatBookingText(booking: ITrialBooking): string {
  const lines = [
    `Name: ${booking.parentName}`,
    `Email: ${booking.email}`,
    `WhatsApp: ${booking.whatsapp}`,
    `Learner: ${booking.learnerType}`,
    `Teacher preference: ${booking.teacherPreference}`,
    booking.timeSlot ? `Preferred time: ${booking.timeSlot}` : null,
    booking.preferredDays.length
      ? `Preferred days: ${booking.preferredDays.join(", ")}`
      : null,
    booking.timezone ? `Timezone: ${booking.timezone}` : null,
    booking.source ? `How they heard: ${booking.source}` : null,
    booking.courseSlug ? `Course: ${booking.courseSlug}` : null,
    booking.teacherSlug ? `Teacher: ${booking.teacherSlug}` : null,
    booking.utmSource ? `UTM: ${booking.utmSource} / ${booking.utmMedium ?? ""}` : null,
    `Submitted: ${booking.createdAt.toISOString()}`,
  ].filter(Boolean);

  return lines.join("\n");
}

export function formatTrialBooking(booking: ITrialBooking) {
  return {
    _id: booking._id.toString(),
    parentName: booking.parentName,
    email: booking.email,
    whatsapp: booking.whatsapp,
    learnerType: booking.learnerType,
    timeSlot: booking.timeSlot,
    teacherPreference: booking.teacherPreference,
    preferredDays: booking.preferredDays ?? [],
    timezone: booking.timezone,
    source: booking.source,
    courseSlug: booking.courseSlug,
    teacherSlug: booking.teacherSlug,
    utmSource: booking.utmSource,
    utmMedium: booking.utmMedium,
    utmCampaign: booking.utmCampaign,
    utmContent: booking.utmContent,
    status: booking.status,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
  };
}

export async function createTrialBooking(
  input: CreateTrialBookingInput
): Promise<{ booking: ITrialBooking } | { error: string }> {
  const parentName = input.parentName?.trim();
  const email = input.email?.trim().toLowerCase();
  const whatsapp = input.whatsapp?.trim();

  if (!parentName || !email || !whatsapp) {
    return { error: "Name, email, and WhatsApp are required." };
  }

  if (!EMAIL_RE.test(email)) {
    return { error: "Invalid email address." };
  }

  if (!["child", "teen", "adult"].includes(input.learnerType)) {
    return { error: "Invalid learner type." };
  }

  const booking = await TrialBooking.create({
    parentName,
    email,
    whatsapp,
    learnerType: input.learnerType,
    timeSlot: input.timeSlot,
    teacherPreference: input.teacherPreference ?? "any",
    preferredDays: input.preferredDays ?? [],
    timezone: input.timezone?.trim(),
    source: input.source?.trim(),
    courseSlug: input.courseSlug?.trim(),
    teacherSlug: input.teacherSlug?.trim(),
    utmSource: input.utmSource?.trim(),
    utmMedium: input.utmMedium?.trim(),
    utmCampaign: input.utmCampaign?.trim(),
    utmContent: input.utmContent?.trim(),
  });

  const notifyTo = notifyEmail();
  if (notifyTo) {
    const text = formatBookingText(booking);
    await sendEmail({
      to: notifyTo,
      subject: `[Trial] ${parentName} — ${booking.learnerType}`,
      text,
      html: text.replace(/\n/g, "<br>"),
    }).catch((err) => {
      console.warn("[trial] Notification email failed:", err);
    });
  } else {
    console.log("\n--- New trial booking (no TRIAL_NOTIFY_EMAIL) ---");
    console.log(formatBookingText(booking));
    console.log("---\n");
  }

  return { booking };
}

export async function listTrialBookings(status?: TrialBookingStatus, limit = 100) {
  const filter = status ? { status } : {};
  const rows = await TrialBooking.find(filter).sort({ createdAt: -1 }).limit(limit);
  return rows.map(formatTrialBooking);
}

export async function updateTrialBookingStatus(
  id: string,
  status: TrialBookingStatus
): Promise<{ booking: ReturnType<typeof formatTrialBooking> } | { error: string }> {
  const booking = await TrialBooking.findByIdAndUpdate(
    id,
    { status },
    { new: true, runValidators: true }
  );

  if (!booking) {
    return { error: "Trial booking not found" };
  }

  return { booking: formatTrialBooking(booking) };
}

export async function countTrialBookingsByStatus(status: TrialBookingStatus): Promise<number> {
  return TrialBooking.countDocuments({ status });
}
