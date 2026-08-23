"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatStudentAdmission = formatStudentAdmission;
exports.buildEnrollmentDefaultsFromFormData = buildEnrollmentDefaultsFromFormData;
exports.createStudentAdmissionApplication = createStudentAdmissionApplication;
exports.listStudentAdmissionApplications = listStudentAdmissionApplications;
exports.updateStudentAdmissionStatus = updateStudentAdmissionStatus;
exports.updateAdmissionPaymentStatus = updateAdmissionPaymentStatus;
exports.updateAdmissionEnrollment = updateAdmissionEnrollment;
exports.deleteStudentAdmissionApplication = deleteStudentAdmissionApplication;
const StudentAdmissionApplication_1 = require("../models/StudentAdmissionApplication");
const TrialBooking_1 = require("../models/TrialBooking");
const resolveTeacherAssignment_1 = require("../lib/resolveTeacherAssignment");
const emailService_1 = require("./emailService");
const notificationService_1 = require("./notificationService");
const whatsappPhone_1 = require("../lib/whatsappPhone");
const admissionPackageDefaults_1 = require("../lib/admissionPackageDefaults");
const trialMeetingPlatform_1 = require("../lib/trialMeetingPlatform");
const leadPortalAccountService_1 = require("./leadPortalAccountService");
const admissionAdvancePaymentService_1 = require("./admissionAdvancePaymentService");
const applicationPassword_1 = require("../lib/applicationPassword");
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
        formData: (0, applicationPassword_1.stripPasswordFields)(app.formData ?? {}),
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
const CLASS_DAYS = new Set([
    "Saturday",
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
]);
function buildEnrollmentDefaultsFromFormData(formData, options) {
    const packagePlan = typeof formData.packagePlan === "string" ? formData.packagePlan : "standard";
    const defaults = (0, admissionPackageDefaults_1.getPackageDefaults)(packagePlan);
    const hour = typeof formData.preferredHour === "string" ? formData.preferredHour : "6";
    const minute = typeof formData.preferredMinute === "string" ? formData.preferredMinute : "00";
    const period = formData.preferredPeriod === "AM" || formData.preferredPeriod === "PM"
        ? formData.preferredPeriod
        : "PM";
    const classTime = options?.preferredTrialTime?.trim() ||
        (0, admissionPackageDefaults_1.formatClassTime24)(hour, minute, period);
    const teacherSlug = options?.teacherSlug?.trim() ||
        (typeof formData.assignedTeacherSlug === "string"
            ? formData.assignedTeacherSlug.trim()
            : undefined);
    const teacherName = options?.teacherName?.trim() ||
        (typeof formData.assignedTeacherName === "string"
            ? formData.assignedTeacherName.trim()
            : undefined);
    const meetingPlatform = options?.meetingPlatform ||
        (0, trialMeetingPlatform_1.parseTrialMeetingPlatform)(formData.meetingPlatform);
    const meetingLink = (0, trialMeetingPlatform_1.normalizeMeetingLink)(options?.meetingLink ||
        (typeof formData.meetingLink === "string" ? formData.meetingLink : "")) || undefined;
    const currency = formData.admissionFeeCurrency === "usd" ? "usd" : "bdt";
    return {
        classTime,
        assignedTeacherSlug: teacherSlug,
        assignedTeacherName: teacherName,
        meetingPlatform,
        meetingLink,
        classesPerWeek: defaults.classesPerWeek,
        classDurationMinutes: defaults.durationMinutes,
        monthlyFeeAmount: currency === "usd" ? defaults.monthlyFeeUsd : defaults.monthlyFeeBdt,
        monthlyFeeCurrency: currency,
        classTimeHour: hour,
        classTimeMinute: minute,
        classTimePeriod: period,
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
    const passwordResult = (0, applicationPassword_1.readApplicationPassword)(input.formData);
    if ("error" in passwordResult)
        return passwordResult;
    const passwordHash = await (0, applicationPassword_1.hashApplicationPassword)(passwordResult.password);
    const sanitizedFormData = (0, applicationPassword_1.stripPasswordFields)(input.formData);
    const allowedMethods = new Set(["bkash", "nagad", "bank", "cash"]);
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
        formData: sanitizedFormData,
        passwordHash,
        locale,
        paymentStatus: "pending",
        ...(() => {
            const enrollment = buildEnrollmentDefaultsFromFormData(sanitizedFormData);
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
            `Admission fee: ${feeAmount} ${String(sanitizedFormData.admissionFeeCurrency ?? "bdt").toUpperCase()} via ${feeMethod}`,
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
    const application = await StudentAdmissionApplication_1.StudentAdmissionApplication.findById(id).select("+passwordHash");
    if (!application) {
        return { error: "Application not found" };
    }
    if (status === "approved" || status === "rejected") {
        const provision = await (0, leadPortalAccountService_1.provisionStudentFromAdmission)(application);
        if ("error" in provision)
            return provision;
        if (application.sourceTrialBookingId) {
            await TrialBooking_1.TrialBooking.findByIdAndUpdate(application.sourceTrialBookingId, { status });
        }
    }
    else if (application.linkedUserId) {
        await (0, leadPortalAccountService_1.deactivateAdmissionLinkedUser)(application);
    }
    application.status = status;
    if (adminNote !== undefined) {
        application.adminNote = adminNote.trim() || undefined;
    }
    await application.save();
    return { application: formatStudentAdmission(application) };
}
async function updateAdmissionPaymentStatus(id, paymentStatus, rejectReason) {
    if (!["pending", "verified", "rejected"].includes(paymentStatus)) {
        return { error: "Invalid payment status." };
    }
    const application = await StudentAdmissionApplication_1.StudentAdmissionApplication.findById(id).select("+passwordHash");
    if (!application) {
        return { error: "Application not found" };
    }
    application.paymentStatus = paymentStatus;
    if (paymentStatus === "verified") {
        application.paymentVerifiedAt = new Date();
        application.paymentRejectedAt = undefined;
        application.paymentRejectReason = undefined;
    }
    else if (paymentStatus === "rejected") {
        application.paymentRejectedAt = new Date();
        application.paymentVerifiedAt = undefined;
        application.paymentRejectReason = rejectReason?.trim() || undefined;
    }
    else {
        application.paymentVerifiedAt = undefined;
        application.paymentRejectedAt = undefined;
        application.paymentRejectReason = undefined;
    }
    await application.save();
    if (paymentStatus === "verified" && (application.status === "approved" || application.status === "rejected")) {
        if (!application.linkedUserId) {
            const provision = await (0, leadPortalAccountService_1.provisionStudentFromAdmission)(application);
            if ("error" in provision)
                return provision;
            if (application.sourceTrialBookingId) {
                await TrialBooking_1.TrialBooking.findByIdAndUpdate(application.sourceTrialBookingId, { status: application.status });
            }
        }
        else {
            await (0, admissionAdvancePaymentService_1.approveAdvanceMonthlyPayment)(application);
        }
    }
    return { application: formatStudentAdmission(application) };
}
async function updateAdmissionEnrollment(id, input) {
    const application = await StudentAdmissionApplication_1.StudentAdmissionApplication.findById(id);
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
        if (!Number.isFinite(input.classDurationMinutes) ||
            input.classDurationMinutes < 15) {
            return { error: "Class duration must be at least 15 minutes." };
        }
        application.classDurationMinutes = Math.round(input.classDurationMinutes);
    }
    if (input.classTimeHour !== undefined ||
        input.classTimeMinute !== undefined ||
        input.classTimePeriod !== undefined) {
        const hour = input.classTimeHour ?? "6";
        const minute = input.classTimeMinute ?? "00";
        const period = input.classTimePeriod ?? "PM";
        application.classTime = (0, admissionPackageDefaults_1.formatClassTime24)(hour, minute, period);
    }
    if (input.assignedTeacherSlug !== undefined) {
        const slug = input.assignedTeacherSlug.trim();
        if (!slug) {
            application.assignedTeacherSlug = undefined;
            application.assignedTeacherName = undefined;
        }
        else {
            const teacher = await (0, resolveTeacherAssignment_1.resolveTeacherAssignment)(slug);
            if ("error" in teacher)
                return teacher;
            application.assignedTeacherSlug = teacher.slug;
            application.assignedTeacherName = teacher.name;
        }
    }
    if (input.meetingPlatform !== undefined) {
        application.meetingPlatform = input.meetingPlatform || undefined;
    }
    if (input.meetingLink !== undefined) {
        application.meetingLink =
            (0, trialMeetingPlatform_1.normalizeMeetingLink)(input.meetingLink) || undefined;
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
async function deleteStudentAdmissionApplication(id) {
    const deleted = await StudentAdmissionApplication_1.StudentAdmissionApplication.findByIdAndDelete(id);
    if (!deleted) {
        return { error: "Application not found" };
    }
    return { ok: true };
}
