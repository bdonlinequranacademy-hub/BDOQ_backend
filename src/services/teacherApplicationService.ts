import {
  TeacherApplication,
  type ITeacherApplication,
  type ITeacherApplicationFiles,
  type TeacherApplicationStatus,
} from "../models/TeacherApplication";
import { sendEmail } from "./emailService";
import { signalAdminPending } from "./notificationService";
import { normalizeWhatsAppForStorage } from "../lib/whatsappPhone";

export type { TeacherApplicationStatus };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function notifyEmail(): string | null {
  const to =
    process.env.TEACHER_NOTIFY_EMAIL?.trim() ||
    process.env.TRIAL_NOTIFY_EMAIL?.trim() ||
    process.env.FROM_EMAIL?.trim() ||
    process.env.TEST_EMAIL_TO?.trim();
  return to || null;
}

export function formatTeacherApplication(app: ITeacherApplication) {
  return {
    _id: app._id.toString(),
    fullName: app.fullName,
    email: app.email,
    phone: app.phone,
    formData: app.formData,
    files: app.files,
    locale: app.locale,
    status: app.status,
    adminNote: app.adminNote,
    createdAt: app.createdAt,
    updatedAt: app.updatedAt,
  };
}

export async function createTeacherApplication(input: {
  fullName: string;
  email: string;
  phone: string;
  formData: Record<string, unknown>;
  files: ITeacherApplicationFiles;
  locale?: "en" | "bn";
}): Promise<{ application: ITeacherApplication } | { error: string }> {
  const fullName = input.fullName?.trim();
  const email = input.email?.trim().toLowerCase();
  const phoneRaw = input.phone?.trim();

  if (!fullName || !email || !phoneRaw) {
    return { error: "Full name, email, and phone are required." };
  }

  if (!EMAIL_RE.test(email)) {
    return { error: "Invalid email address." };
  }

  if (!input.formData || typeof input.formData !== "object") {
    return { error: "Application data is required." };
  }

  if (!input.files?.cvUrl || !input.files?.profilePhotoUrl || !input.files?.certificateUrl) {
    return { error: "CV, certificate, and profile photo are required." };
  }

  const countryHint =
    typeof input.formData.country === "string"
      ? input.formData.country
      : typeof input.formData.nationality === "string"
        ? input.formData.nationality
        : "Bangladesh";
  const normalizedPhone = normalizeWhatsAppForStorage(phoneRaw, countryHint);
  if (!normalizedPhone.ok) {
    return { error: normalizedPhone.error };
  }

  const locale = input.locale === "bn" ? "bn" : input.locale === "en" ? "en" : undefined;

  const application = await TeacherApplication.create({
    fullName,
    email,
    phone: normalizedPhone.whatsapp,
    formData: input.formData,
    files: input.files,
    locale,
  });

  const notifyTo = notifyEmail();
  if (notifyTo) {
    const text = [
      `New teacher application`,
      `Name: ${fullName}`,
      `Email: ${email}`,
      `Phone: ${normalizedPhone.whatsapp}`,
      `Submitted: ${application.createdAt.toISOString()}`,
    ].join("\n");

    await sendEmail({
      to: notifyTo,
      subject: `[Teacher Application] ${fullName}`,
      text,
      html: text.replace(/\n/g, "<br>"),
    }).catch((err) => {
      console.warn("[teacher-app] Notification email failed:", err);
    });
  }

  signalAdminPending("teacher-application");

  return { application };
}

export async function listTeacherApplications(
  status?: TeacherApplicationStatus,
  limit = 100
) {
  const filter = status ? { status } : {};
  const rows = await TeacherApplication.find(filter).sort({ createdAt: -1 }).limit(limit);
  return rows.map(formatTeacherApplication);
}

export async function updateTeacherApplicationStatus(
  id: string,
  status: TeacherApplicationStatus,
  adminNote?: string
): Promise<
  { application: ReturnType<typeof formatTeacherApplication> } | { error: string }
> {
  const application = await TeacherApplication.findByIdAndUpdate(
    id,
    {
      status,
      ...(adminNote !== undefined ? { adminNote: adminNote.trim() || undefined } : {}),
    },
    { new: true, runValidators: true }
  );

  if (!application) {
    return { error: "Application not found" };
  }

  return { application: formatTeacherApplication(application) };
}
