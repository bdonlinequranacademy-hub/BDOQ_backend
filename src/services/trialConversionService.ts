import crypto from "crypto";
import { TrialBooking } from "../models/TrialBooking";
import {
  StudentAdmissionApplication,
  type IStudentAdmissionApplication,
} from "../models/StudentAdmissionApplication";
import { User } from "../models/User";
import { resolveTeacherAssignment } from "../lib/resolveTeacherAssignment";
import { buildAdmissionFormDataFromTrial } from "../lib/trialToAdmissionMapper";
import {
  buildEnrollmentDefaultsFromFormData,
  formatStudentAdmission,
  type StudentAdmissionStatus,
} from "./studentAdmissionService";
import { formatTrialBooking } from "./trialBookingService";
import { getPublicSiteBaseUrl, getPortalBaseUrl } from "../lib/email/resolveAuthOrigin";
import { syncUserFromAdmission } from "./userProfileSyncService";
import { extractParentInfoFromFormData } from "../lib/parentInfoFromFormData";
import {
  hashApplicationPassword,
  readApplicationPassword,
  stripPasswordFields,
} from "../lib/applicationPassword";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ConvertTrialToAdmissionInput {
  email: string;
  locale?: "en" | "bn";
}

export interface IConvertTrialToAdmissionResult {
  booking: ReturnType<typeof formatTrialBooking>;
  admission: ReturnType<typeof formatStudentAdmission>;
  prefillUrl: string;
  portalAdmissionPath: string;
}

function generateToken(): string {
  return crypto.randomBytes(24).toString("hex");
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

  const studentName = booking.studentName?.trim() || "Student";
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

  booking.convertedAdmissionId = admission._id;
  booking.convertedAt = new Date();
  booking.admissionPrefillToken = prefillToken;
  if (booking.status !== "reviewing") {
    booking.status = "reviewing";
  }
  await booking.save();

  const prefillUrl = `${getPublicSiteBaseUrl()}/student-admission?prefill=${prefillToken}`;

  return {
    booking: formatTrialBooking(booking),
    admission: formatStudentAdmission(admission),
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
  application.status = "pending";
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
