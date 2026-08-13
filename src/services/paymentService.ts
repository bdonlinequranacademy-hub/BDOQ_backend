import type { BillingCurrency } from "../models/StudentBilling";

export const BILLING_CURRENCIES: BillingCurrency[] = [
  "USD",
  "GBP",
  "EUR",
  "BDT",
  "CAD",
  "AUD",
];

export const PAYMENT_METHODS = [
  "zelle",
  "wise",
  "bank_transfer",
  "cash_app",
  "other",
] as const;

export function addMonths(from: Date, months: number): Date {
  const result = new Date(from);
  result.setMonth(result.getMonth() + months);
  return result;
}

export function computePaidUntil(
  currentPaidUntil: Date | null | undefined,
  monthsCovered: number
): Date {
  const base =
    currentPaidUntil && currentPaidUntil.getTime() > Date.now()
      ? new Date(currentPaidUntil)
      : new Date();
  return addMonths(base, monthsCovered);
}

export function billingStatusLabel(
  paidUntil: Date | null | undefined
): "current" | "due_soon" | "overdue" | "not_set" {
  if (!paidUntil) return "not_set";
  const now = new Date();
  const msDay = 24 * 60 * 60 * 1000;
  const daysLeft = Math.ceil((paidUntil.getTime() - now.getTime()) / msDay);
  if (daysLeft < 0) return "overdue";
  if (daysLeft <= 7) return "due_soon";
  return "current";
}

export function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function parsePaymentDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}
