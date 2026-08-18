"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PAYMENT_METHODS = exports.BILLING_CURRENCIES = void 0;
exports.addMonths = addMonths;
exports.computePaidUntil = computePaidUntil;
exports.billingStatusLabel = billingStatusLabel;
exports.parseNumber = parseNumber;
exports.parsePaymentDate = parsePaymentDate;
exports.BILLING_CURRENCIES = [
    "USD",
    "GBP",
    "EUR",
    "BDT",
    "CAD",
    "AUD",
];
exports.PAYMENT_METHODS = [
    "zelle",
    "wise",
    "bank_transfer",
    "cash_app",
    "bkash",
    "nagad",
    "rocket",
    "other",
];
function addMonths(from, months) {
    const result = new Date(from);
    result.setMonth(result.getMonth() + months);
    return result;
}
function computePaidUntil(currentPaidUntil, monthsCovered) {
    const base = currentPaidUntil && currentPaidUntil.getTime() > Date.now()
        ? new Date(currentPaidUntil)
        : new Date();
    return addMonths(base, monthsCovered);
}
function billingStatusLabel(paidUntil) {
    if (!paidUntil)
        return "not_set";
    const now = new Date();
    const msDay = 24 * 60 * 60 * 1000;
    const daysLeft = Math.ceil((paidUntil.getTime() - now.getTime()) / msDay);
    if (daysLeft < 0)
        return "overdue";
    if (daysLeft <= 7)
        return "due_soon";
    return "current";
}
function parseNumber(value) {
    if (typeof value === "number" && Number.isFinite(value))
        return value;
    if (typeof value === "string" && value.trim()) {
        const n = Number(value);
        return Number.isFinite(n) ? n : null;
    }
    return null;
}
function parsePaymentDate(value) {
    if (typeof value !== "string" || !value.trim())
        return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
}
