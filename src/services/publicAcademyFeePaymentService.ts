import type { IUser } from "../models/User";
import { User } from "../models/User";
import { StudentAdmissionApplication } from "../models/StudentAdmissionApplication";
import { PaymentRecord, type PaymentMethod } from "../models/PaymentRecord";
import { StudentBilling } from "../models/StudentBilling";
import { signalAdminPending } from "./notificationService";
import { notifyAdminsNewPayment } from "./paymentReminderService";

export type PublicFeeCategory = "admission_fee" | "monthly_tuition";
export type PublicFeeMethod = "bkash" | "nagad" | "rocket" | "bank";
export type PublicFeeCurrency = "BDT" | "USD";

export interface SubmitPublicFeePaymentInput {
  category: PublicFeeCategory;
  amount: number;
  currency: PublicFeeCurrency;
  method: PublicFeeMethod;
  payerName: string;
  whatsapp: string;
  note?: string;
  reference: string;
  paymentDate: Date;
  screenshotUrl: string;
  screenshotPublicId: string;
  linkedUser?: IUser | null;
}

function last10Digits(raw: string | undefined | null): string {
  const digits = String(raw ?? "").replace(/\D/g, "");
  return digits.length <= 10 ? digits : digits.slice(-10);
}

function sameWhatsApp(left?: string | null, right?: string | null): boolean {
  const a = last10Digits(left);
  const b = last10Digits(right);
  return a.length >= 10 && a === b;
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function formString(formData: Record<string, unknown> | undefined, key: string): string {
  if (!formData) return "";
  const value = formData[key];
  return typeof value === "string" ? value.trim() : "";
}

function mapAdmissionMethod(method: PublicFeeMethod): string {
  if (method === "bank") return "bank";
  return method;
}

function mapMonthlyMethod(method: PublicFeeMethod): PaymentMethod {
  if (method === "bank") return "bank_transfer";
  return method;
}

function applicationWhatsAppValues(
  application: InstanceType<typeof StudentAdmissionApplication>
): string[] {
  const formData = application.formData ?? {};
  return [
    application.whatsapp,
    formString(formData, "whatsapp"),
    formString(formData, "guardianWhatsapp"),
  ].filter(Boolean);
}

async function findAdmissionApplication(whatsapp: string, payerName: string) {
  const applications = await StudentAdmissionApplication.find({
    status: { $ne: "closed" },
  }).sort({ createdAt: -1 });

  const byWhatsApp = applications.filter((application) =>
    applicationWhatsAppValues(application).some((value) => sameWhatsApp(value, whatsapp))
  );
  if (byWhatsApp.length > 0) return byWhatsApp[0];

  const name = normalizeName(payerName);
  const byName = applications.filter(
    (application) => normalizeName(application.fullName) === name
  );
  if (byName.length > 1) {
    return {
      error:
        "Multiple admission applications match this name. Please enter the WhatsApp number used on the admission form.",
    } as const;
  }
  if (byName.length === 1) return byName[0];
  return null;
}

async function findStudentUser(
  whatsapp: string,
  payerName: string,
  linkedUser?: IUser | null
) {
  if (linkedUser?.role === "student") return linkedUser;

  const students = await User.find({
    role: "student",
    isActive: { $ne: false },
  }).select("name email whatsapp parentInfo country");

  const byWhatsApp = students.filter(
    (student) =>
      sameWhatsApp(student.whatsapp, whatsapp) ||
      sameWhatsApp(student.parentInfo?.whatsapp, whatsapp)
  );
  if (byWhatsApp.length > 0) return byWhatsApp[0];

  const name = normalizeName(payerName);
  const byName = students.filter((student) => normalizeName(student.name) === name);
  if (byName.length > 1) {
    return {
      error:
        "Multiple students match this name. Please enter the student or guardian WhatsApp number.",
    } as const;
  }
  if (byName.length === 1) return byName[0];
  return null;
}

async function submitAdmissionFee(input: SubmitPublicFeePaymentInput) {
  const matched = await findAdmissionApplication(input.whatsapp, input.payerName);
  if (matched && "error" in matched) return matched;
  if (!matched) {
    return {
      error:
        "No matching admission application found. Use the WhatsApp number from the student admission form.",
    };
  }

  if (matched.paymentStatus === "verified") {
    return { error: "This admission fee is already verified." };
  }

  const dateStr = input.paymentDate.toISOString().slice(0, 10);
  matched.formData = {
    ...(matched.formData ?? {}),
    admissionFeeAmount: String(input.amount),
    admissionFeeCurrency: input.currency === "USD" ? "usd" : "bdt",
    admissionFeePaymentMethod: mapAdmissionMethod(input.method),
    admissionPaymentReference: input.reference,
    admissionPaymentDate: dateStr,
    admissionPaymentProofUrl: input.screenshotUrl,
    admissionPaymentProofPublicId: input.screenshotPublicId,
    admissionPaymentPublicNote: input.note || undefined,
  };
  matched.markModified("formData");
  matched.paymentStatus = "pending";
  matched.paymentRejectedAt = undefined;
  matched.paymentRejectReason = undefined;
  await matched.save();
  signalAdminPending("student-admission");

  return {
    kind: "admission_fee" as const,
    id: matched._id.toString(),
  };
}

async function submitMonthlyTuition(input: SubmitPublicFeePaymentInput) {
  const matched = await findStudentUser(
    input.whatsapp,
    input.payerName,
    input.linkedUser
  );
  if (matched && "error" in matched) return matched;
  if (!matched) {
    return {
      error:
        "No matching student account found. Use the student or guardian WhatsApp number from the portal.",
    };
  }

  let billing = await StudentBilling.findOne({ student: matched._id });
  if (!billing) {
    billing = await StudentBilling.create({
      student: matched._id,
      monthlyFee: input.amount,
      currency: input.currency,
      dueDayOfMonth: 1,
      paidUntil: null,
      isActive: true,
    });
  }

  await PaymentRecord.create({
    student: matched._id,
    amount: input.amount,
    currency: input.currency,
    country: matched.country || "Bangladesh",
    paymentDate: input.paymentDate,
    monthsCovered: 1,
    method: mapMonthlyMethod(input.method),
    reference: input.reference,
    note:
      input.note ||
      `Monthly tuition submitted from the public payments page by ${input.payerName}.`,
    screenshotUrl: input.screenshotUrl,
    screenshotPublicId: input.screenshotPublicId,
    status: "pending",
  });

  await notifyAdminsNewPayment(matched.name).catch(() => undefined);

  return {
    kind: "monthly_tuition" as const,
    id: matched._id.toString(),
  };
}

export async function submitPublicAcademyFeePayment(
  input: SubmitPublicFeePaymentInput
): Promise<{ kind: PublicFeeCategory; id: string } | { error: string }> {
  if (input.category === "admission_fee") {
    return submitAdmissionFee(input);
  }
  return submitMonthlyTuition(input);
}
