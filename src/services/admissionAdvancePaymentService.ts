import type { IUser } from "../models/User";
import type { IStudentAdmissionApplication } from "../models/StudentAdmissionApplication";
import { PaymentRecord, type PaymentMethod } from "../models/PaymentRecord";
import { StudentBilling } from "../models/StudentBilling";
import { getPackageDefaults } from "../lib/admissionPackageDefaults";
import { computePaidUntil } from "./paymentService";
import { notifyAdminsNewPayment } from "./paymentReminderService";

function formString(formData: Record<string, unknown> | undefined, key: string): string {
  if (!formData) return "";
  const value = formData[key];
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function wantsAdvanceMonth(formData: Record<string, unknown> | undefined): boolean {
  const choice = formData?.monthlyTuitionChoice;
  if (choice === "yes") return true;
  if (choice === "no") return false;
  const value = formData?.payCurrentMonthTuition;
  return value === true || value === "true" || value === "yes" || value === "on";
}

function mapAdmissionMethod(raw: string): PaymentMethod {
  const method = raw.toLowerCase();
  if (method === "bank" || method === "bank_transfer") return "bank_transfer";
  if (method === "bkash" || method === "nagad" || method === "rocket") {
    return method;
  }
  return "other";
}

export async function provisionBillingFromAdmission(
  user: IUser,
  application: IStudentAdmissionApplication
): Promise<void> {
  const formData = application.formData ?? {};
  const defaults = getPackageDefaults(formString(formData, "packagePlan"));
  const currencyRaw = (
    application.monthlyFeeCurrency ||
    formString(formData, "admissionFeeCurrency") ||
    "bdt"
  ).toLowerCase();
  const billingCurrency = currencyRaw === "usd" ? "USD" : "BDT";
  const monthlyFee =
    application.monthlyFeeAmount ??
    (billingCurrency === "USD" ? defaults.monthlyFeeUsd : defaults.monthlyFeeBdt);

  let billing = await StudentBilling.findOne({ student: user._id });
  if (!billing) {
    billing = await StudentBilling.create({
      student: user._id,
      monthlyFee,
      currency: billingCurrency,
      dueDayOfMonth: 1,
      paidUntil: null,
      isActive: true,
    });
  } else {
    billing.monthlyFee = monthlyFee;
    billing.currency = billingCurrency;
    billing.isActive = true;
    await billing.save();
  }

  if (!wantsAdvanceMonth(formData)) return;

  const existing = await PaymentRecord.findOne({
    student: user._id,
    sourceAdmissionId: application._id,
  });
  if (existing) {
    if (application.paymentStatus === "verified" && existing.status === "pending") {
      await approveAdvanceMonthlyPayment(application);
    }
    return;
  }

  const amount = Number(formString(formData, "monthlyTuitionAmount")) || monthlyFee;
  const proofUrl =
    formString(formData, "monthlyTuitionProofUrl") ||
    formString(formData, "admissionPaymentProofUrl");
  if (!proofUrl || amount <= 0) return;

  const reference =
    formString(formData, "monthlyTuitionReference") ||
    formString(formData, "admissionPaymentReference") ||
    `ADM-${application._id.toString().slice(-8)}`;
  const dateRaw =
    formString(formData, "monthlyTuitionDate") ||
    formString(formData, "admissionPaymentDate");
  const parsedDate = dateRaw ? new Date(`${dateRaw}T00:00:00`) : new Date();
  const verified = application.paymentStatus === "verified";
  const paidUntilAfter = verified ? computePaidUntil(billing.paidUntil, 1) : undefined;

  await PaymentRecord.create({
    student: user._id,
    amount,
    currency: billingCurrency,
    country:
      formString(formData, "currentCountry") ||
      formString(formData, "country") ||
      user.country ||
      "Bangladesh",
    paymentDate: Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate,
    monthsCovered: 1,
    method: mapAdmissionMethod(
      formString(formData, "monthlyTuitionPaymentMethod") ||
        formString(formData, "admissionFeePaymentMethod") ||
        formString(formData, "paymentMethod")
    ),
    reference,
    note: "Running month tuition paid in advance with student admission.",
    screenshotUrl: proofUrl,
    screenshotPublicId:
      formString(formData, "monthlyTuitionProofPublicId") ||
      formString(formData, "admissionPaymentProofPublicId") ||
      "admission-proof",
    status: verified ? "approved" : "pending",
    paidUntilAfter,
    sourceAdmissionId: application._id,
    reviewedAt: verified ? new Date() : undefined,
  });

  if (verified && paidUntilAfter) {
    billing.paidUntil = paidUntilAfter;
    billing.lastReminderAt = null;
    billing.lastReminderKind = null;
    await billing.save();
  } else {
    await notifyAdminsNewPayment(user.name).catch(() => undefined);
  }
}

export async function approveAdvanceMonthlyPayment(
  application: IStudentAdmissionApplication
): Promise<void> {
  if (!application.linkedUserId) return;

  const record = await PaymentRecord.findOne({
    student: application.linkedUserId,
    sourceAdmissionId: application._id,
    status: "pending",
  });
  if (!record) return;

  let billing = await StudentBilling.findOne({ student: application.linkedUserId });
  if (!billing) {
    billing = await StudentBilling.create({
      student: application.linkedUserId,
      monthlyFee: record.amount / Math.max(record.monthsCovered, 1),
      currency: record.currency,
      dueDayOfMonth: 1,
      paidUntil: null,
      isActive: true,
    });
  }

  const paidUntilAfter = computePaidUntil(billing.paidUntil, record.monthsCovered);
  billing.paidUntil = paidUntilAfter;
  billing.lastReminderAt = null;
  billing.lastReminderKind = null;
  await billing.save();

  record.status = "approved";
  record.reviewedAt = new Date();
  record.paidUntilAfter = paidUntilAfter;
  await record.save();
}
