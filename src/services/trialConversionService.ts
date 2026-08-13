import crypto from "crypto";
import bcrypt from "bcryptjs";
import { TrialBooking, type ITrialBooking } from "../models/TrialBooking";
import {
  StudentAdmissionApplication,
  type IStudentAdmissionApplication,
} from "../models/StudentAdmissionApplication";
import { User, type IUser } from "../models/User";
import { resolveTeacherAssignment } from "../lib/resolveTeacherAssignment";
import { buildAdmissionFormDataFromTrial } from "../lib/trialToAdmissionMapper";
import {
  buildEnrollmentDefaultsFromFormData,
  formatStudentAdmission,
  type StudentAdmissionStatus,
} from "./studentAdmissionService";
import { formatTrialBooking } from "./trialBookingService";
import { normalizeWhatsAppForStorage } from "../lib/whatsappPhone";
import { generateStudentId } from "../utils/studentId";
import { getPublicSiteBaseUrl, getPortalBaseUrl } from "../lib/email/resolveAuthOrigin";
import { sendEmail } from "./emailService";
import {
  buildBrandEmailHtml,
  buildBrandEmailText,
} from "../lib/email/brandEmailTemplate";
import { EMAIL_BRAND } from "../lib/email/emailConfig";
import {
  syncUserFromAdmission,
  buildEnrollmentSummaryFromAdmission,
} from "./userProfileSyncService";
import { extractParentInfoFromFormData } from "../lib/parentInfoFromFormData";
import {
  hashApplicationPassword,
  readApplicationPassword,
  stripPasswordFields,
} from "../lib/applicationPassword";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ConvertTrialToAdmissionInput {
  email: string;
  createUser?: boolean;
  locale?: "en" | "bn";
}

export interface IConvertTrialToAdmissionResult {
  booking: ReturnType<typeof formatTrialBooking>;
  admission: ReturnType<typeof formatStudentAdmission>;
  user?: {
    _id: string;
    email: string;
    temporaryPassword?: string;
  };
  prefillUrl: string;
  portalAdmissionPath: string;
}

function generateToken(): string {
  return crypto.randomBytes(24).toString("hex");
}

function generateTemporaryPassword(): string {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let password = "";
  for (let i = 0; i < 10; i += 1) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }
  return password;
}

async function sendStudentWelcomeEmail(
  email: string,
  name: string,
  temporaryPassword: string
): Promise<void> {
  const loginUrl = `${getPortalBaseUrl()}/login`;
  const content = {
    title: "Your student portal account is ready",
    greeting: `Assalamu Alaikum ${name},`,
    messageBody: [
      `Welcome to ${EMAIL_BRAND.legalName}.`,
      "",
      "Your student portal account has been created after your free trial class.",
      "",
      `Email: ${email}`,
      `Temporary password: ${temporaryPassword}`,
      "",
      "Please sign in and change your password after first login.",
    ].join("\n"),
    buttonText: "Sign in to portal",
    buttonLink: loginUrl,
    preheader: "Your BDOQ Academy student account is ready",
  };

  await sendEmail({
    to: email,
    subject: `Welcome to ${EMAIL_BRAND.name} — Student Portal`,
    text: buildBrandEmailText(content),
    html: buildBrandEmailHtml(content),
  }).catch((err) => {
    console.warn("[trial-convert] Welcome email failed:", err);
  });
}

async function createStudentUserFromTrial(
  booking: ITrialBooking,
  email: string
): Promise<{ user: IUser; temporaryPassword: string } | { error: string }> {
  const studentName = booking.studentName?.trim() || booking.parentName;
  const country = booking.country?.trim() || "Bangladesh";
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return { error: "A portal user with this email already exists." };
  }

  const normalizedWa = normalizeWhatsAppForStorage(booking.whatsapp, country);
  if (!normalizedWa.ok) {
    return { error: normalizedWa.error };
  }

  const temporaryPassword = generateTemporaryPassword();
  const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

  const user = await User.create({
    name: studentName,
    email: email.toLowerCase(),
    password: hashedPassword,
    role: "student",
    emailVerified: true,
    country,
    timezone: booking.timezone?.trim() || "Asia/Dhaka",
    whatsapp: normalizedWa.whatsapp,
    studentId: await generateStudentId(),
    gender: booking.learnerGender,
    parentInfo: {
      name: booking.parentName?.trim() || undefined,
      relationship: "Parent/Guardian",
      whatsapp: normalizedWa.whatsapp,
      email: email.toLowerCase(),
    },
  });

  return { user, temporaryPassword };
}

export async function convertTrialToAdmission(
  trialId: string,
  input: ConvertTrialToAdmissionInput
): Promise<IConvertTrialToAdmissionResult | { error: string }> {
  const booking = await TrialBooking.findById(trialId);
  if (!booking) {
    return { error: "Trial booking not found" };
  }

  if (booking.convertedAdmissionId) {
    return { error: "This trial lead has already been converted to admission." };
  }

  const email = (input.email?.trim() || booking.email?.trim() || "").toLowerCase();
  if (!email || !EMAIL_RE.test(email)) {
    return { error: "A valid email is required to convert this trial lead." };
  }

  const teacherResult = booking.teacherSlug?.trim()
    ? await resolveTeacherAssignment(booking.teacherSlug)
    : null;
  const teacher =
    teacherResult && !("error" in teacherResult) ? teacherResult : null;

  const studentName = booking.studentName?.trim() || booking.parentName;
  const formData = buildAdmissionFormDataFromTrial({
    booking,
    email,
    teacherName: teacher?.name,
  });
  const prefillToken = generateToken();
  const locale = input.locale === "bn" ? "bn" : input.locale === "en" ? "en" : undefined;

  const enrollmentDefaults = buildEnrollmentDefaultsFromFormData(formData, {
    teacherSlug: teacher?.slug ?? booking.teacherSlug,
    teacherName: teacher?.name,
    meetingPlatform: booking.meetingPlatform,
    meetingLink: booking.meetingLink,
    preferredTrialTime: booking.preferredTrialTime,
  });

  const admission = await StudentAdmissionApplication.create({
    fullName: studentName,
    email,
    whatsapp: booking.whatsapp,
    formData,
    locale,
    status: "reviewing" satisfies StudentAdmissionStatus,
    adminNote: `Converted from trial lead ${booking._id.toString()}. Parent completes payment via prefill link.`,
    sourceTrialBookingId: booking._id,
    prefillToken,
    convertedFromTrial: true,
    paymentStatus: "pending",
    classTime: enrollmentDefaults.classTime,
    assignedTeacherSlug: enrollmentDefaults.assignedTeacherSlug,
    assignedTeacherName: enrollmentDefaults.assignedTeacherName,
    meetingPlatform: enrollmentDefaults.meetingPlatform,
    meetingLink: enrollmentDefaults.meetingLink,
    classesPerWeek: enrollmentDefaults.classesPerWeek,
    classDurationMinutes: enrollmentDefaults.classDurationMinutes,
    monthlyFeeAmount: enrollmentDefaults.monthlyFeeAmount,
    monthlyFeeCurrency: enrollmentDefaults.monthlyFeeCurrency,
  });

  let createdUser:
    | { user: IUser; temporaryPassword: string }
    | undefined;

  const shouldCreateUser = input.createUser !== false;
  if (shouldCreateUser) {
    const userResult = await createStudentUserFromTrial(booking, email);
    if ("error" in userResult) {
      await StudentAdmissionApplication.findByIdAndDelete(admission._id);
      return { error: userResult.error };
    }
    createdUser = userResult;
    booking.convertedUserId = userResult.user._id;
    await syncUserFromAdmission(userResult.user, admission);
    await sendStudentWelcomeEmail(email, studentName, userResult.temporaryPassword);
  }

  booking.convertedAdmissionId = admission._id;
  booking.convertedAt = new Date();
  if (booking.status !== "closed") {
    booking.status = "closed";
  }
  await booking.save();

  const prefillUrl = `${getPublicSiteBaseUrl()}/student-admission?prefill=${prefillToken}`;

  return {
    booking: formatTrialBooking(booking),
    admission: formatStudentAdmission(admission),
    user: createdUser
      ? {
          _id: createdUser.user._id.toString(),
          email: createdUser.user.email,
          temporaryPassword: createdUser.temporaryPassword,
        }
      : undefined,
    prefillUrl,
    portalAdmissionPath: `${getPortalBaseUrl()}/admin/student-admissions`,
  };
}

export async function getAdmissionPrefillByToken(
  token: string
): Promise<{ prefill: Record<string, unknown>; prefillToken: string } | { error: string }> {
  const trimmed = token.trim();
  if (!trimmed) return { error: "Prefill token is required." };

  const application = await StudentAdmissionApplication.findOne({
    prefillToken: trimmed,
    convertedFromTrial: true,
  });

  if (!application) {
    return { error: "Prefill link is invalid or expired." };
  }

  if (application.formData.admissionPaymentProofUrl) {
    return { error: "This admission application has already been submitted." };
  }

  return {
    prefill: application.formData,
    prefillToken: trimmed,
  };
}

export async function completePrefilledAdmission(
  token: string,
  input: {
    fullName: string;
    email: string;
    whatsapp: string;
    formData: Record<string, unknown>;
  }
): Promise<
  { application: ReturnType<typeof formatStudentAdmission> } | { error: string }
> {
  const application = await StudentAdmissionApplication.findOne({
    prefillToken: token.trim(),
    convertedFromTrial: true,
  });

  if (!application) {
    return { error: "Prefill link is invalid or expired." };
  }

  if (application.formData.admissionPaymentProofUrl) {
    return { error: "This admission application has already been submitted." };
  }

  const feeMethod =
    typeof input.formData.admissionFeePaymentMethod === "string"
      ? input.formData.admissionFeePaymentMethod.trim()
      : "";
  const feeReference =
    typeof input.formData.admissionPaymentReference === "string"
      ? input.formData.admissionPaymentReference.trim()
      : "";
  const feeDate =
    typeof input.formData.admissionPaymentDate === "string"
      ? input.formData.admissionPaymentDate.trim()
      : "";
  const feeAmount =
    typeof input.formData.admissionFeeAmount === "string"
      ? input.formData.admissionFeeAmount.trim()
      : String(input.formData.admissionFeeAmount ?? "").trim();
  const proofUrl =
    typeof input.formData.admissionPaymentProofUrl === "string"
      ? input.formData.admissionPaymentProofUrl.trim()
      : "";

  if (!feeMethod || !feeReference || !feeDate || !feeAmount || !proofUrl) {
    return { error: "Admission fee payment details and proof are required." };
  }

  const passwordResult = readApplicationPassword(input.formData);
  if ("error" in passwordResult) return passwordResult;
  application.passwordHash = await hashApplicationPassword(passwordResult.password);

  application.fullName = input.fullName.trim();
  application.email = input.email.trim().toLowerCase();
  application.whatsapp = input.whatsapp.trim();
  application.formData = {
    ...stripPasswordFields(application.formData ?? {}),
    ...stripPasswordFields(input.formData),
    prefillToken: token.trim(),
  };
  application.status = "new";
  application.paymentStatus = "pending";
  application.adminNote =
    `${application.adminNote ?? ""}\nPayment submitted via trial prefill link.`.trim();

  const enrollmentDefaults = buildEnrollmentDefaultsFromFormData({
    ...application.formData,
    ...input.formData,
  });
  application.classTime = enrollmentDefaults.classTime ?? application.classTime;
  application.assignedTeacherSlug =
    enrollmentDefaults.assignedTeacherSlug ?? application.assignedTeacherSlug;
  application.assignedTeacherName =
    enrollmentDefaults.assignedTeacherName ?? application.assignedTeacherName;
  application.meetingPlatform =
    enrollmentDefaults.meetingPlatform ?? application.meetingPlatform;
  application.meetingLink =
    enrollmentDefaults.meetingLink ?? application.meetingLink;
  application.classesPerWeek =
    enrollmentDefaults.classesPerWeek ?? application.classesPerWeek;
  application.classDurationMinutes =
    enrollmentDefaults.classDurationMinutes ?? application.classDurationMinutes;
  application.monthlyFeeAmount =
    enrollmentDefaults.monthlyFeeAmount ?? application.monthlyFeeAmount;
  application.monthlyFeeCurrency =
    enrollmentDefaults.monthlyFeeCurrency ?? application.monthlyFeeCurrency;

  await application.save();

  const trial = application.sourceTrialBookingId
    ? await TrialBooking.findById(application.sourceTrialBookingId)
    : null;
  if (trial?.convertedUserId) {
    const user = await User.findById(trial.convertedUserId);
    if (user) {
      if (application.passwordHash) {
        user.password = application.passwordHash;
      }
      await syncUserFromAdmission(user, application);
    }
  } else {
    const parentInfo = extractParentInfoFromFormData(application.formData);
    const user = await User.findOne({
      email: application.email,
      role: "student",
    });
    if (user && parentInfo) {
      user.parentInfo = parentInfo;
      user.sourceAdmissionId = application._id;
      await user.save();
      application.linkedUserId = user._id;
      await application.save();
    }
  }

  return { application: formatStudentAdmission(application) };
}

export function findPrefilledAdmissionByToken(
  token: string
): Promise<IStudentAdmissionApplication | null> {
  return StudentAdmissionApplication.findOne({
    prefillToken: token.trim(),
    convertedFromTrial: true,
  });
}
