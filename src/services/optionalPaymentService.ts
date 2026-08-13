import mongoose from "mongoose";
import type { IUser } from "../models/User";
import {
  OptionalPayment,
  OPTIONAL_PAYMENT_CATEGORIES,
  OPTIONAL_PAYMENT_CURRENCIES,
  OPTIONAL_PAYMENT_METHODS,
  OPTIONAL_PAYMENT_STATUSES,
  type IOptionalPayment,
  type OptionalPaymentCategory,
  type OptionalPaymentCurrency,
  type OptionalPaymentMethod,
  type OptionalPaymentStatus,
} from "../models/OptionalPayment";
import { signalAdminPending, createUserNotification } from "./notificationService";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type OptionalPaymentSource = "public" | "portal";

export interface CreateOptionalPaymentInput {
  category: unknown;
  customLabel?: unknown;
  amount: unknown;
  currency?: unknown;
  method: unknown;
  payerName: unknown;
  email?: unknown;
  whatsapp?: unknown;
  note?: unknown;
  reference: unknown;
  paymentDate: unknown;
  screenshotUrl: string;
  screenshotPublicId: string;
  locale?: unknown;
  source: OptionalPaymentSource;
  linkedUser?: IUser | null;
}

function parseCategory(value: unknown): OptionalPaymentCategory | null {
  if (
    typeof value === "string" &&
    (OPTIONAL_PAYMENT_CATEGORIES as readonly string[]).includes(value)
  ) {
    return value as OptionalPaymentCategory;
  }
  return null;
}

function parseMethod(value: unknown): OptionalPaymentMethod | null {
  if (
    typeof value === "string" &&
    (OPTIONAL_PAYMENT_METHODS as readonly string[]).includes(value)
  ) {
    return value as OptionalPaymentMethod;
  }
  return null;
}

function parseCurrency(value: unknown): OptionalPaymentCurrency {
  if (
    typeof value === "string" &&
    (OPTIONAL_PAYMENT_CURRENCIES as readonly string[]).includes(value)
  ) {
    return value as OptionalPaymentCurrency;
  }
  return "BDT";
}

function parseStatus(value: unknown): OptionalPaymentStatus | undefined {
  if (
    typeof value === "string" &&
    (OPTIONAL_PAYMENT_STATUSES as readonly string[]).includes(value)
  ) {
    return value as OptionalPaymentStatus;
  }
  return undefined;
}

function parseLocale(value: unknown): "en" | "bn" | undefined {
  if (value === "en" || value === "bn") return value;
  return undefined;
}

function parseAmount(value: unknown): number | null {
  const amount = typeof value === "number" ? value : Number(String(value ?? "").trim());
  if (!Number.isFinite(amount) || amount < 1) return null;
  return Math.round(amount * 100) / 100;
}

function parsePaymentDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(`${value.trim()}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function populatedUser(value: unknown): IUser | null {
  if (!value || typeof value !== "object" || !("name" in value)) return null;
  return value as IUser;
}

export function formatOptionalPayment(record: IOptionalPayment) {
  const linked = populatedUser(record.linkedUserId);
  return {
    _id: record._id.toString(),
    category: record.category,
    customLabel: record.customLabel || undefined,
    amount: record.amount,
    currency: record.currency,
    method: record.method,
    payerName: record.payerName,
    email: record.email || undefined,
    whatsapp: record.whatsapp || undefined,
    note: record.note || undefined,
    reference: record.reference,
    paymentDate: record.paymentDate.toISOString(),
    screenshotUrl: record.screenshotUrl,
    status: record.status,
    rejectionReason: record.rejectionReason || undefined,
    linkedUser: linked
      ? {
          _id: linked._id.toString(),
          name: linked.name,
          email: linked.email,
          role: linked.role,
        }
      : null,
    source: record.source,
    locale: record.locale,
    reviewedAt: record.reviewedAt?.toISOString(),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export async function createOptionalPayment(
  input: CreateOptionalPaymentInput
): Promise<{ payment: IOptionalPayment } | { error: string }> {
  const category = parseCategory(input.category);
  if (!category) return { error: "Select a valid payment category." };

  const customLabel =
    typeof input.customLabel === "string" ? input.customLabel.trim() : "";
  if (category === "custom" && customLabel.length < 2) {
    return { error: "Please describe this custom payment." };
  }

  const amount = parseAmount(input.amount);
  if (amount == null) return { error: "Enter a valid amount." };

  const method = parseMethod(input.method);
  if (!method) return { error: "Select a payment method." };

  const payerName =
    typeof input.payerName === "string" ? input.payerName.trim() : "";
  if (payerName.length < 2) return { error: "Full name is required." };

  const email =
    typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  if (email && !EMAIL_RE.test(email)) return { error: "Invalid email address." };

  const whatsapp =
    typeof input.whatsapp === "string" ? input.whatsapp.trim() : "";
  if (!email && !whatsapp) {
    return { error: "Provide an email or WhatsApp number." };
  }

  const reference =
    typeof input.reference === "string" ? input.reference.trim() : "";
  if (reference.length < 3) {
    return { error: "Transaction / reference number is required." };
  }

  const paymentDate = parsePaymentDate(input.paymentDate);
  if (!paymentDate) return { error: "Payment date is required." };

  if (!input.screenshotUrl || !input.screenshotPublicId) {
    return { error: "Payment screenshot is required." };
  }

  const note = typeof input.note === "string" ? input.note.trim() : "";

  const payment = await OptionalPayment.create({
    category,
    customLabel: category === "custom" ? customLabel : undefined,
    amount,
    currency: parseCurrency(input.currency),
    method,
    payerName,
    email: email || undefined,
    whatsapp: whatsapp || undefined,
    note: note || undefined,
    reference,
    paymentDate,
    screenshotUrl: input.screenshotUrl,
    screenshotPublicId: input.screenshotPublicId,
    locale: parseLocale(input.locale),
    source: input.source,
    linkedUserId: input.linkedUser?._id,
    status: "pending",
  });

  signalAdminPending("optional-payment");

  return { payment };
}

export async function listOptionalPaymentsForUser(userId: string) {
  const records = await OptionalPayment.find({ linkedUserId: userId })
    .sort({ createdAt: -1 })
    .limit(100);
  return records.map(formatOptionalPayment);
}

export async function listAdminOptionalPayments(filters: {
  status?: unknown;
  category?: unknown;
}) {
  const query: Record<string, unknown> = {};
  const status = parseStatus(filters.status);
  const category = parseCategory(filters.category);
  if (status) query.status = status;
  if (category) query.category = category;

  const records = await OptionalPayment.find(query)
    .populate("linkedUserId", "name email role")
    .sort({ createdAt: -1 })
    .limit(300);

  return records.map(formatOptionalPayment);
}

export async function countPendingOptionalPayments(): Promise<number> {
  return OptionalPayment.countDocuments({ status: "pending" });
}

export async function reviewOptionalPayment(input: {
  id: string;
  status: "approved" | "rejected";
  reviewerId: string;
  reason?: unknown;
}): Promise<{ payment: IOptionalPayment } | { error: string; code?: number }> {
  if (!mongoose.Types.ObjectId.isValid(input.id)) {
    return { error: "Invalid payment id", code: 400 };
  }

  const payment = await OptionalPayment.findById(input.id);
  if (!payment) return { error: "Payment not found", code: 404 };

  if (payment.status !== "pending") {
    return { error: "This payment has already been reviewed.", code: 400 };
  }

  const reason =
    typeof input.reason === "string" ? input.reason.trim() : "";
  if (input.status === "rejected" && reason.length < 2) {
    return { error: "Please provide a rejection reason.", code: 400 };
  }

  payment.status = input.status;
  payment.reviewedBy = new mongoose.Types.ObjectId(input.reviewerId);
  payment.reviewedAt = new Date();
  payment.rejectionReason = input.status === "rejected" ? reason : undefined;
  await payment.save();

  if (payment.linkedUserId) {
    await createUserNotification({
      userId: payment.linkedUserId,
      title:
        input.status === "approved"
          ? "Gift / donation approved"
          : "Gift / donation not approved",
      message:
        input.status === "approved"
          ? "JazakAllahu khairan — your optional payment was approved."
          : `Your optional payment was not approved. ${reason}`,
      type: "payment",
    });
  }

  return { payment };
}
