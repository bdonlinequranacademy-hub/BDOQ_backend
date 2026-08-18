"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatOptionalPayment = formatOptionalPayment;
exports.createOptionalPayment = createOptionalPayment;
exports.listOptionalPaymentsForUser = listOptionalPaymentsForUser;
exports.listAdminOptionalPayments = listAdminOptionalPayments;
exports.countPendingOptionalPayments = countPendingOptionalPayments;
exports.reviewOptionalPayment = reviewOptionalPayment;
const mongoose_1 = __importDefault(require("mongoose"));
const OptionalPayment_1 = require("../models/OptionalPayment");
const notificationService_1 = require("./notificationService");
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function parseCategory(value) {
    if (typeof value === "string" &&
        OptionalPayment_1.OPTIONAL_PAYMENT_CATEGORIES.includes(value)) {
        return value;
    }
    return null;
}
function parseMethod(value) {
    if (typeof value === "string" &&
        OptionalPayment_1.OPTIONAL_PAYMENT_METHODS.includes(value)) {
        return value;
    }
    return null;
}
function parseCurrency(value) {
    if (typeof value === "string" &&
        OptionalPayment_1.OPTIONAL_PAYMENT_CURRENCIES.includes(value)) {
        return value;
    }
    return "BDT";
}
function parseStatus(value) {
    if (typeof value === "string" &&
        OptionalPayment_1.OPTIONAL_PAYMENT_STATUSES.includes(value)) {
        return value;
    }
    return undefined;
}
function parseLocale(value) {
    if (value === "en" || value === "bn")
        return value;
    return undefined;
}
function parseAmount(value) {
    const amount = typeof value === "number" ? value : Number(String(value ?? "").trim());
    if (!Number.isFinite(amount) || amount < 1)
        return null;
    return Math.round(amount * 100) / 100;
}
function parsePaymentDate(value) {
    if (typeof value !== "string" || !value.trim())
        return null;
    const date = new Date(`${value.trim()}T00:00:00`);
    if (Number.isNaN(date.getTime()))
        return null;
    return date;
}
function populatedUser(value) {
    if (!value || typeof value !== "object" || !("name" in value))
        return null;
    return value;
}
function formatOptionalPayment(record) {
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
async function createOptionalPayment(input) {
    const category = parseCategory(input.category);
    if (!category)
        return { error: "Select a valid payment category." };
    const customLabel = typeof input.customLabel === "string" ? input.customLabel.trim() : "";
    if (category === "custom" && customLabel.length < 2) {
        return { error: "Please describe this custom payment." };
    }
    const amount = parseAmount(input.amount);
    if (amount == null)
        return { error: "Enter a valid amount." };
    const method = parseMethod(input.method);
    if (!method)
        return { error: "Select a payment method." };
    const payerName = typeof input.payerName === "string" ? input.payerName.trim() : "";
    if (payerName.length < 2)
        return { error: "Full name is required." };
    const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
    if (email && !EMAIL_RE.test(email))
        return { error: "Invalid email address." };
    const whatsapp = typeof input.whatsapp === "string" ? input.whatsapp.trim() : "";
    const reference = typeof input.reference === "string" ? input.reference.trim() : "";
    if (reference.length < 3) {
        return { error: "Transaction / reference number is required." };
    }
    const paymentDate = parsePaymentDate(input.paymentDate);
    if (!paymentDate)
        return { error: "Payment date is required." };
    if (!input.screenshotUrl || !input.screenshotPublicId) {
        return { error: "Payment screenshot is required." };
    }
    const note = typeof input.note === "string" ? input.note.trim() : "";
    const payment = await OptionalPayment_1.OptionalPayment.create({
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
    (0, notificationService_1.signalAdminPending)("optional-payment");
    return { payment };
}
async function listOptionalPaymentsForUser(userId) {
    const records = await OptionalPayment_1.OptionalPayment.find({ linkedUserId: userId })
        .sort({ createdAt: -1 })
        .limit(100);
    return records.map(formatOptionalPayment);
}
async function listAdminOptionalPayments(filters) {
    const query = {};
    const status = parseStatus(filters.status);
    const category = parseCategory(filters.category);
    if (status)
        query.status = status;
    if (category)
        query.category = category;
    const records = await OptionalPayment_1.OptionalPayment.find(query)
        .populate("linkedUserId", "name email role")
        .sort({ createdAt: -1 })
        .limit(300);
    return records.map(formatOptionalPayment);
}
async function countPendingOptionalPayments() {
    return OptionalPayment_1.OptionalPayment.countDocuments({ status: "pending" });
}
async function reviewOptionalPayment(input) {
    if (!mongoose_1.default.Types.ObjectId.isValid(input.id)) {
        return { error: "Invalid payment id", code: 400 };
    }
    const payment = await OptionalPayment_1.OptionalPayment.findById(input.id);
    if (!payment)
        return { error: "Payment not found", code: 404 };
    if (payment.status !== "pending") {
        return { error: "This payment has already been reviewed.", code: 400 };
    }
    const reason = typeof input.reason === "string" ? input.reason.trim() : "";
    if (input.status === "rejected" && reason.length < 2) {
        return { error: "Please provide a rejection reason.", code: 400 };
    }
    payment.status = input.status;
    payment.reviewedBy = new mongoose_1.default.Types.ObjectId(input.reviewerId);
    payment.reviewedAt = new Date();
    payment.rejectionReason = input.status === "rejected" ? reason : undefined;
    await payment.save();
    if (payment.linkedUserId) {
        await (0, notificationService_1.createUserNotification)({
            userId: payment.linkedUserId,
            title: input.status === "approved"
                ? "Gift / donation approved"
                : "Gift / donation not approved",
            message: input.status === "approved"
                ? "JazakAllahu khairan — your optional payment was approved."
                : `Your optional payment was not approved. ${reason}`,
            type: "payment",
        });
    }
    return { payment };
}
