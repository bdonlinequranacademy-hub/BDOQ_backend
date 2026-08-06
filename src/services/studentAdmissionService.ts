import {
  StudentAdmissionApplication,
  type IStudentAdmissionApplication,
  type StudentAdmissionStatus,
  type StudentAdmissionPaymentStatus,
  type StudentAdmissionClassDay,
} from "../models/StudentAdmissionApplication";
import { TeacherProfile } from "../models/TeacherProfile";
import { sendEmail } from "./emailService";
import { signalAdminPending } from "./notificationService";
import { normalizeWhatsAppForStorage } from "../lib/whatsappPhone";
import {
  getPackageDefaults,
  formatClassTime24,
} from "../lib/admissionPackageDefaults";
import {
  parseTrialMeetingPlatform,
  normalizeMeetingLink,
} from "../lib/trialMeetingPlatform";

export type { StudentAdmissionStatus, StudentAdmissionPaymentStatus };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function notifyEmail(): string | null {
  const to =
    process.env.ADMISSION_NOTIFY_EMAIL?.trim() ||
    process.env.TRIAL_NOTIFY_EMAIL?.trim() ||
    process.env.FROM_EMAIL?.trim() ||
    process.env.TEST_EMAIL_TO?.trim();
  return to || null;
}

export function formatStudentAdmission(app: IStudentAdmissionApplication) {
  return {
    _id: app._id.toString(),
    fullName: app.fullName,
    email: app.email,
    whatsapp: app.whatsapp,
    formData: app.formData,
    locale: app.locale,
    status: app.status,
    adminNote: app.adminNote,
    sourceTrialBookingId: app.sourceTrialBookingId?.toString(),
    convertedFromTrial: app.convertedFromTrial ?? false,
    paymentStatus: app.paymentStatus ?? "pending",
    paymentVerifiedAt: app.paymentVerifiedAt,
    paymentRejectedAt: app.paymentRejectedAt,
    paymentRejectReason: app.paymentRejectReason,
    classStartDate: app.classStartDate,
    classDays: app.classDays ?? [],
    classesPerWeek: app.classesPerWeek,
    classDurationMinutes: app.classDurationMinutes,
    classTime: app.classTime,
    assignedTeacherSlug: app.assignedTeacherSlug,
    assignedTeacherName: app.assignedTeacherName,
    meetingPlatform: app.meetingPlatform,
    meetingLink: app.meetingLink,
    monthlyFeeAmount: app.monthlyFeeAmount,
    monthlyFeeCurrency: app.monthlyFeeCurrency,
    enrollmentSetupAt: app.enrollmentSetupAt,
    linkedUserId: app.linkedUserId?.toString(),
    createdAt: app.createdAt,
    updatedAt: app.updatedAt,
  };
}

export interface IUpdateAdmissionEnrollmentInput {
  classStartDate?: string;
  classDays?: StudentAdmissionClassDay[];
  classesPerWeek?: number;
  classDurationMinutes?: number;
  classTimeHour?: string;
  classTimeMinute?: string;
  classTimePeriod?: "AM" | "PM";
  assignedTeacherSlug?: string;
  meetingPlatform?: ReturnType<typeof parseTrialMeetingPlatform>;
  meetingLink?: string;
  monthlyFeeAmount?: number;
  monthlyFeeCurrency?: "bdt" | "usd";
}

const CLASS_DAYS = new Set<StudentAdmissionClassDay>([
  "Saturday",
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
]);

export function buildEnrollmentDefaultsFromFormData(
  formData: Record<string, unknown>,
  options?: {
    teacherSlug?: string;
    teacherName?: string;
    meetingPlatform?: ReturnType<typeof parseTrialMeetingPlatform>;
    meetingLink?: string;
    preferredTrialTime?: string;
  }
): Partial<IUpdateAdmissionEnrollmentInput> & {
  classTime?: string;
  assignedTeacherSlug?: string;
  assignedTeacherName?: string;
  meetingPlatform?: ReturnType<typeof parseTrialMeetingPlatform>;
  meetingLink?: string;
  classesPerWeek?: number;
  classDurationMinutes?: number;
  monthlyFeeAmount?: number;
  monthlyFeeCurrency?: "bdt" | "usd";
} {
  const packagePlan =
    typeof formData.packagePlan === "string" ? formData.packagePlan : "standard";
  const defaults = getPackageDefaults(packagePlan);

  const hour =
    typeof formData.preferredHour === "string" ? formData.preferredHour : "6";
  const minute =
    typeof formData.preferredMinute === "string" ? formData.preferredMinute : "00";
  const period =
    formData.preferredPeriod === "AM" || formData.preferredPeriod === "PM"
      ? formData.preferredPeriod
      : "PM";

  const classTime =
    options?.preferredTrialTime?.trim() ||
    formatClassTime24(hour, minute, period);

  const teacherSlug =
    options?.teacherSlug?.trim() ||
    (typeof formData.assignedTeacherSlug === "string"
      ? formData.assignedTeacherSlug.trim()
      : undefined);

  const teacherName =
    options?.teacherName?.trim() ||
    (typeof formData.assignedTeacherName === "string"
      ? formData.assignedTeacherName.trim()
      : undefined);

  const meetingPlatform =
    options?.meetingPlatform ||
    parseTrialMeetingPlatform(formData.meetingPlatform);

  const meetingLink =
    normalizeMeetingLink(
      options?.meetingLink ||
        (typeof formData.meetingLink === "string" ? formData.meetingLink : "")
    ) || undefined;

  const currency =
    formData.admissionFeeCurrency === "usd" ? "usd" : ("bdt" as const);

  return {
    classTime,
    assignedTeacherSlug: teacherSlug,
    assignedTeacherName: teacherName,
    meetingPlatform,
    meetingLink,
    classesPerWeek: defaults.classesPerWeek,
    classDurationMinutes: defaults.durationMinutes,
    monthlyFeeAmount:
      currency === "usd" ? defaults.monthlyFeeUsd : defaults.monthlyFeeBdt,
    monthlyFeeCurrency: currency,
    classTimeHour: hour,
    classTimeMinute: minute,
    classTimePeriod: period,
  };
}

export async function createStudentAdmissionApplication(input: {
  fullName: string;
  email: string;
  whatsapp: string;
  formData: Record<string, unknown>;
  locale?: "en" | "bn";
}): Promise<{ application: IStudentAdmissionApplication } | { error: string }> {
  const fullName = input.fullName?.trim();
  const email = input.email?.trim().toLowerCase();
  const whatsappRaw = input.whatsapp?.trim();

  if (!fullName || !email || !whatsappRaw) {
    return { error: "Full name, email, and WhatsApp are required." };
  }

  if (!EMAIL_RE.test(email)) {
    return { error: "Invalid email address." };
  }

  if (!input.formData || typeof input.formData !== "object") {
    return { error: "Application data is required." };
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

  if (!feeMethod || !feeReference || !feeDate || !feeAmount) {
    return {
      error:
        "Admission fee payment details are required (method, amount, reference, and date).",
    };
  }

  if (!proofUrl) {
    return { error: "Payment proof screenshot is required." };
  }

  const allowedMethods = new Set(["bkash", "nagad", "bank", "paypal", "cash"]);
  if (!allowedMethods.has(feeMethod)) {
    return { error: "Invalid admission fee payment method." };
  }

  const parsedAmount = Number(feeAmount);
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    return { error: "Invalid admission fee amount." };
  }

  const countryHint =
    typeof input.formData.country === "string"
      ? input.formData.country
      : typeof input.formData.studentCountry === "string"
        ? input.formData.studentCountry
        : undefined;
  const normalizedWa = normalizeWhatsAppForStorage(whatsappRaw, countryHint);
  if (!normalizedWa.ok) {
    return { error: normalizedWa.error };
  }

  const locale = input.locale === "bn" ? "bn" : input.locale === "en" ? "en" : undefined;

  const application = await StudentAdmissionApplication.create({
    fullName,
    email,
    whatsapp: normalizedWa.whatsapp,
    formData: input.formData,
    locale,
    paymentStatus: "pending",
    ...(() => {
      const enrollment = buildEnrollmentDefaultsFromFormData(input.formData);
      return {
        classTime: enrollment.classTime,
        assignedTeacherSlug: enrollment.assignedTeacherSlug,
        assignedTeacherName: enrollment.assignedTeacherName,
        meetingPlatform: enrollment.meetingPlatform,
        meetingLink: enrollment.meetingLink,
        classesPerWeek: enrollment.classesPerWeek,
        classDurationMinutes: enrollment.classDurationMinutes,
        monthlyFeeAmount: enrollment.monthlyFeeAmount,
        monthlyFeeCurrency: enrollment.monthlyFeeCurrency,
      };
    })(),
  });

  const notifyTo = notifyEmail();
  if (notifyTo) {
    const text = [
      `New student admission application`,
      `Name: ${fullName}`,
      `Email: ${email}`,
      `WhatsApp: ${normalizedWa.whatsapp}`,
      `Admission fee: ${feeAmount} ${String(input.formData.admissionFeeCurrency ?? "bdt").toUpperCase()} via ${feeMethod}`,
      `Reference: ${feeReference}`,
      `Submitted: ${application.createdAt.toISOString()}`,
    ].join("\n");

    await sendEmail({
      to: notifyTo,
      subject: `[Admission] ${fullName}`,
      text,
      html: text.replace(/\n/g, "<br>"),
    }).catch((err) => {
      console.warn("[admission] Notification email failed:", err);
    });
  }

  signalAdminPending("student-admission");

  return { application };
}

export async function listStudentAdmissionApplications(
  status?: StudentAdmissionStatus,
  limit = 100
) {
  const filter = status ? { status } : {};
  const rows = await StudentAdmissionApplication.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit);
  return rows.map(formatStudentAdmission);
}

export async function updateStudentAdmissionStatus(
  id: string,
  status: StudentAdmissionStatus,
  adminNote?: string
): Promise<
  { application: ReturnType<typeof formatStudentAdmission> } | { error: string }
> {
  const application = await StudentAdmissionApplication.findByIdAndUpdate(
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

  return { application: formatStudentAdmission(application) };
}

export async function updateAdmissionPaymentStatus(
  id: string,
  paymentStatus: StudentAdmissionPaymentStatus,
  rejectReason?: string
): Promise<
  { application: ReturnType<typeof formatStudentAdmission> } | { error: string }
> {
  if (!["pending", "verified", "rejected"].includes(paymentStatus)) {
    return { error: "Invalid payment status." };
  }

  const application = await StudentAdmissionApplication.findById(id);
  if (!application) {
    return { error: "Application not found" };
  }

  application.paymentStatus = paymentStatus;

  if (paymentStatus === "verified") {
    application.paymentVerifiedAt = new Date();
    application.paymentRejectedAt = undefined;
    application.paymentRejectReason = undefined;
  } else if (paymentStatus === "rejected") {
    application.paymentRejectedAt = new Date();
    application.paymentVerifiedAt = undefined;
    application.paymentRejectReason = rejectReason?.trim() || undefined;
  } else {
    application.paymentVerifiedAt = undefined;
    application.paymentRejectedAt = undefined;
    application.paymentRejectReason = undefined;
  }

  await application.save();
  return { application: formatStudentAdmission(application) };
}

export async function updateAdmissionEnrollment(
  id: string,
  input: IUpdateAdmissionEnrollmentInput
): Promise<
  { application: ReturnType<typeof formatStudentAdmission> } | { error: string }
> {
  const application = await StudentAdmissionApplication.findById(id);
  if (!application) {
    return { error: "Application not found" };
  }

  if (input.classStartDate !== undefined) {
    application.classStartDate = input.classStartDate.trim() || undefined;
  }

  if (input.classDays !== undefined) {
    const days = input.classDays.filter((day) => CLASS_DAYS.has(day));
    application.classDays = days;
  }

  if (input.classesPerWeek !== undefined) {
    if (!Number.isFinite(input.classesPerWeek) || input.classesPerWeek < 1) {
      return { error: "Classes per week must be at least 1." };
    }
    application.classesPerWeek = Math.round(input.classesPerWeek);
  }

  if (input.classDurationMinutes !== undefined) {
    if (
      !Number.isFinite(input.classDurationMinutes) ||
      input.classDurationMinutes < 15
    ) {
      return { error: "Class duration must be at least 15 minutes." };
    }
    application.classDurationMinutes = Math.round(input.classDurationMinutes);
  }

  if (
    input.classTimeHour !== undefined ||
    input.classTimeMinute !== undefined ||
    input.classTimePeriod !== undefined
  ) {
    const hour = input.classTimeHour ?? "6";
    const minute = input.classTimeMinute ?? "00";
    const period = input.classTimePeriod ?? "PM";
    application.classTime = formatClassTime24(hour, minute, period);
  }

  if (input.assignedTeacherSlug !== undefined) {
    const slug = input.assignedTeacherSlug.trim();
    if (!slug) {
      application.assignedTeacherSlug = undefined;
      application.assignedTeacherName = undefined;
    } else {
      const teacher = await TeacherProfile.findOne({ slug });
      if (!teacher) {
        return { error: "Selected teacher profile was not found." };
      }
      application.assignedTeacherSlug = slug;
      application.assignedTeacherName = teacher.name;
    }
  }

  if (input.meetingPlatform !== undefined) {
    application.meetingPlatform = input.meetingPlatform || undefined;
  }

  if (input.meetingLink !== undefined) {
    application.meetingLink =
      normalizeMeetingLink(input.meetingLink) || undefined;
  }

  if (input.monthlyFeeAmount !== undefined) {
    if (!Number.isFinite(input.monthlyFeeAmount) || input.monthlyFeeAmount < 0) {
      return { error: "Monthly fee amount is invalid." };
    }
    application.monthlyFeeAmount = input.monthlyFeeAmount;
  }

  if (input.monthlyFeeCurrency !== undefined) {
    application.monthlyFeeCurrency =
      input.monthlyFeeCurrency === "usd" ? "usd" : "bdt";
  }

  application.enrollmentSetupAt = new Date();
  await application.save();

  return { application: formatStudentAdmission(application) };
}
