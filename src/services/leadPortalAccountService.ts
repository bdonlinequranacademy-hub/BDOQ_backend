import bcrypt from "bcryptjs";
import { User, type IUser, type UserGender } from "../models/User";
import type { IStudentAdmissionApplication } from "../models/StudentAdmissionApplication";
import type { ITeacherApplication } from "../models/TeacherApplication";
import { generateStudentId } from "../utils/studentId";
import { normalizeWhatsAppForStorage } from "../lib/whatsappPhone";
import { extractParentInfoFromFormData } from "../lib/parentInfoFromFormData";
import { syncUserFromAdmission } from "./userProfileSyncService";
import { sendEmail } from "./emailService";
import { getPortalBaseUrl } from "../lib/email/resolveAuthOrigin";
import {
  buildBrandEmailHtml,
  buildBrandEmailText,
} from "../lib/email/brandEmailTemplate";
import { EMAIL_BRAND } from "../lib/email/emailConfig";

function generateTemporaryPassword(): string {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let password = "";
  for (let i = 0; i < 10; i += 1) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }
  return password;
}

function formString(formData: Record<string, unknown> | undefined, key: string): string {
  if (!formData) return "";
  const value = formData[key];
  return typeof value === "string" ? value.trim() : "";
}

function formGender(formData: Record<string, unknown> | undefined): UserGender | undefined {
  if (!formData) return undefined;
  return formData.gender === "male" || formData.gender === "female"
    ? formData.gender
    : undefined;
}

function storedWhatsApp(raw: string | undefined, country: string): string | undefined {
  const normalized = normalizeWhatsAppForStorage(raw ?? "", country);
  return normalized.ok && normalized.whatsapp ? normalized.whatsapp : undefined;
}

async function sendWelcomeEmail(input: {
  email: string;
  name: string;
  temporaryPassword: string;
  role: "student" | "teacher";
}): Promise<void> {
  const loginUrl = `${getPortalBaseUrl()}/login`;
  const roleLabel = input.role === "teacher" ? "teacher" : "student";
  const content = {
    title: `Your ${roleLabel} portal account is ready`,
    greeting: `Assalamu Alaikum ${input.name},`,
    messageBody: [
      `Welcome to ${EMAIL_BRAND.legalName}.`,
      "",
      `Your ${roleLabel} portal account has been created after admin approval.`,
      "",
      `Email: ${input.email}`,
      `Temporary password: ${input.temporaryPassword}`,
      "",
      "Please sign in and change your password after first login.",
    ].join("\n"),
    buttonText: "Sign in to portal",
    buttonLink: loginUrl,
    preheader: `Your BDOQ Academy ${roleLabel} account is ready`,
  };

  await sendEmail({
    to: input.email,
    subject: `Welcome to ${EMAIL_BRAND.name} — ${roleLabel === "teacher" ? "Teacher" : "Student"} Portal`,
    text: buildBrandEmailText(content),
    html: buildBrandEmailHtml(content),
  }).catch((err) => {
    console.warn(`[lead-portal] Welcome email failed (${input.role}):`, err);
  });
}

export async function provisionStudentFromAdmission(
  application: IStudentAdmissionApplication
): Promise<{ user: IUser; created: boolean } | { error: string }> {
  const email = application.email.trim().toLowerCase();
  const country =
    formString(application.formData, "currentCountry") ||
    formString(application.formData, "country") ||
    "Bangladesh";
  const timezone = formString(application.formData, "timezone") || "Asia/Dhaka";
  const gender = formGender(application.formData);
  const whatsapp = storedWhatsApp(application.whatsapp, country);

  if (application.linkedUserId) {
    const linked = await User.findById(application.linkedUserId);
    if (linked && linked.role === "student") {
      linked.isActive = true;
      if (whatsapp && !linked.whatsapp) linked.whatsapp = whatsapp;
      if (country && !linked.country) linked.country = country;
      await syncUserFromAdmission(linked, application);
      return { user: linked, created: false };
    }
  }

  const existing = await User.findOne({ email });
  if (existing) {
    if (existing.role !== "student") {
      return {
        error: `This email already belongs to a ${existing.role.replace("_", " ")} account. Change the admission email or create the student from Users.`,
      };
    }
    existing.isActive = true;
    if (whatsapp && !existing.whatsapp) existing.whatsapp = whatsapp;
    if (country && !existing.country) existing.country = country;
    await syncUserFromAdmission(existing, application);
    return { user: existing, created: false };
  }

  const temporaryPassword = generateTemporaryPassword();
  const hashedPassword = await bcrypt.hash(temporaryPassword, 10);
  const user = await User.create({
    name: application.fullName.trim(),
    email,
    password: hashedPassword,
    role: "student",
    emailVerified: true,
    isActive: true,
    country,
    timezone,
    whatsapp,
    studentId: await generateStudentId(),
    gender,
    parentInfo: extractParentInfoFromFormData(application.formData),
    sourceAdmissionId: application._id,
  });

  application.linkedUserId = user._id;
  await application.save();
  await sendWelcomeEmail({
    email,
    name: application.fullName.trim(),
    temporaryPassword,
    role: "student",
  });
  return { user, created: true };
}

export async function deactivateAdmissionLinkedUser(
  application: IStudentAdmissionApplication
): Promise<void> {
  if (!application.linkedUserId) return;
  await User.findOneAndUpdate(
    { _id: application.linkedUserId, role: "student" },
    { isActive: false }
  );
}

export async function provisionTeacherFromApplication(
  application: ITeacherApplication
): Promise<{ user: IUser; created: boolean } | { error: string }> {
  const email = application.email.trim().toLowerCase();
  const country =
    formString(application.formData, "currentCountry") ||
    formString(application.formData, "country") ||
    formString(application.formData, "nationality") ||
    "Bangladesh";
  const timezone = formString(application.formData, "timezone") || "Asia/Dhaka";
  const gender = formGender(application.formData);
  const whatsapp = storedWhatsApp(application.phone, country);

  if (application.linkedUserId) {
    const linked = await User.findById(application.linkedUserId);
    if (linked && linked.role === "teacher") {
      linked.isActive = true;
      if (whatsapp && !linked.whatsapp) linked.whatsapp = whatsapp;
      if (country && !linked.country) linked.country = country;
      if (gender && !linked.gender) linked.gender = gender;
      await linked.save();
      return { user: linked, created: false };
    }
  }

  const existing = await User.findOne({ email });
  if (existing) {
    if (existing.role !== "teacher") {
      return {
        error: `This email already belongs to a ${existing.role.replace("_", " ")} account. Change the application email or create the teacher from Users.`,
      };
    }
    existing.isActive = true;
    if (whatsapp && !existing.whatsapp) existing.whatsapp = whatsapp;
    if (country && !existing.country) existing.country = country;
    if (gender && !existing.gender) existing.gender = gender;
    application.linkedUserId = existing._id;
    await Promise.all([existing.save(), application.save()]);
    return { user: existing, created: false };
  }

  const temporaryPassword = generateTemporaryPassword();
  const hashedPassword = await bcrypt.hash(temporaryPassword, 10);
  const user = await User.create({
    name: application.fullName.trim(),
    email,
    password: hashedPassword,
    role: "teacher",
    emailVerified: true,
    isActive: true,
    country,
    timezone,
    whatsapp,
    gender,
  });

  application.linkedUserId = user._id;
  await application.save();
  await sendWelcomeEmail({
    email,
    name: application.fullName.trim(),
    temporaryPassword,
    role: "teacher",
  });
  return { user, created: true };
}

export async function deactivateTeacherLinkedUser(
  application: ITeacherApplication
): Promise<void> {
  if (!application.linkedUserId) return;
  await User.findOneAndUpdate(
    { _id: application.linkedUserId, role: "teacher" },
    { isActive: false }
  );
}
