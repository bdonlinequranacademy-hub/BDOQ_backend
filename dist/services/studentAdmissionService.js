"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatStudentAdmission = formatStudentAdmission;
exports.createStudentAdmissionApplication = createStudentAdmissionApplication;
exports.listStudentAdmissionApplications = listStudentAdmissionApplications;
exports.updateStudentAdmissionStatus = updateStudentAdmissionStatus;
const StudentAdmissionApplication_1 = require("../models/StudentAdmissionApplication");
const emailService_1 = require("./emailService");
const notificationService_1 = require("./notificationService");
const whatsappPhone_1 = require("../lib/whatsappPhone");
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function notifyEmail() {
    const to = process.env.ADMISSION_NOTIFY_EMAIL?.trim() ||
        process.env.TRIAL_NOTIFY_EMAIL?.trim() ||
        process.env.FROM_EMAIL?.trim() ||
        process.env.TEST_EMAIL_TO?.trim();
    return to || null;
}
function formatStudentAdmission(app) {
    return {
        _id: app._id.toString(),
        fullName: app.fullName,
        email: app.email,
        whatsapp: app.whatsapp,
        formData: app.formData,
        locale: app.locale,
        status: app.status,
        adminNote: app.adminNote,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
    };
}
async function createStudentAdmissionApplication(input) {
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
    const feeMethod = typeof input.formData.admissionFeePaymentMethod === "string"
        ? input.formData.admissionFeePaymentMethod.trim()
        : "";
    const feeReference = typeof input.formData.admissionPaymentReference === "string"
        ? input.formData.admissionPaymentReference.trim()
        : "";
    const feeDate = typeof input.formData.admissionPaymentDate === "string"
        ? input.formData.admissionPaymentDate.trim()
        : "";
    const feeAmount = typeof input.formData.admissionFeeAmount === "string"
        ? input.formData.admissionFeeAmount.trim()
        : String(input.formData.admissionFeeAmount ?? "").trim();
    const proofUrl = typeof input.formData.admissionPaymentProofUrl === "string"
        ? input.formData.admissionPaymentProofUrl.trim()
        : "";
    if (!feeMethod || !feeReference || !feeDate || !feeAmount) {
        return {
            error: "Admission fee payment details are required (method, amount, reference, and date).",
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
    const countryHint = typeof input.formData.country === "string"
        ? input.formData.country
        : typeof input.formData.studentCountry === "string"
            ? input.formData.studentCountry
            : undefined;
    const normalizedWa = (0, whatsappPhone_1.normalizeWhatsAppForStorage)(whatsappRaw, countryHint);
    if (!normalizedWa.ok) {
        return { error: normalizedWa.error };
    }
    const locale = input.locale === "bn" ? "bn" : input.locale === "en" ? "en" : undefined;
    const application = await StudentAdmissionApplication_1.StudentAdmissionApplication.create({
        fullName,
        email,
        whatsapp: normalizedWa.whatsapp,
        formData: input.formData,
        locale,
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
        await (0, emailService_1.sendEmail)({
            to: notifyTo,
            subject: `[Admission] ${fullName}`,
            text,
            html: text.replace(/\n/g, "<br>"),
        }).catch((err) => {
            console.warn("[admission] Notification email failed:", err);
        });
    }
    (0, notificationService_1.signalAdminPending)("student-admission");
    return { application };
}
async function listStudentAdmissionApplications(status, limit = 100) {
    const filter = status ? { status } : {};
    const rows = await StudentAdmissionApplication_1.StudentAdmissionApplication.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit);
    return rows.map(formatStudentAdmission);
}
async function updateStudentAdmissionStatus(id, status, adminNote) {
    const application = await StudentAdmissionApplication_1.StudentAdmissionApplication.findByIdAndUpdate(id, {
        status,
        ...(adminNote !== undefined ? { adminNote: adminNote.trim() || undefined } : {}),
    }, { new: true, runValidators: true });
    if (!application) {
        return { error: "Application not found" };
    }
    return { application: formatStudentAdmission(application) };
}
