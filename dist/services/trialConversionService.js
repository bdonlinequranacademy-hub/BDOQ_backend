"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertTrialToAdmission = convertTrialToAdmission;
exports.getAdmissionPrefillByToken = getAdmissionPrefillByToken;
exports.completePrefilledAdmission = completePrefilledAdmission;
exports.findPrefilledAdmissionByToken = findPrefilledAdmissionByToken;
const crypto_1 = __importDefault(require("crypto"));
const TrialBooking_1 = require("../models/TrialBooking");
const StudentAdmissionApplication_1 = require("../models/StudentAdmissionApplication");
const User_1 = require("../models/User");
const resolveTeacherAssignment_1 = require("../lib/resolveTeacherAssignment");
const trialToAdmissionMapper_1 = require("../lib/trialToAdmissionMapper");
const studentAdmissionService_1 = require("./studentAdmissionService");
const trialBookingService_1 = require("./trialBookingService");
const resolveAuthOrigin_1 = require("../lib/email/resolveAuthOrigin");
const userProfileSyncService_1 = require("./userProfileSyncService");
const parentInfoFromFormData_1 = require("../lib/parentInfoFromFormData");
const applicationPassword_1 = require("../lib/applicationPassword");
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function generateToken() {
    return crypto_1.default.randomBytes(24).toString("hex");
}
async function convertTrialToAdmission(trialId, input) {
    const booking = await TrialBooking_1.TrialBooking.findById(trialId);
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
        ? await (0, resolveTeacherAssignment_1.resolveTeacherAssignment)(booking.teacherSlug)
        : null;
    const teacher = teacherResult && !("error" in teacherResult) ? teacherResult : null;
    const studentName = booking.studentName?.trim() || booking.parentName;
    const formData = (0, trialToAdmissionMapper_1.buildAdmissionFormDataFromTrial)({
        booking,
        email,
        teacherName: teacher?.name,
    });
    const prefillToken = generateToken();
    const locale = input.locale === "bn" ? "bn" : input.locale === "en" ? "en" : undefined;
    const enrollmentDefaults = (0, studentAdmissionService_1.buildEnrollmentDefaultsFromFormData)(formData, {
        teacherSlug: teacher?.slug ?? booking.teacherSlug,
        teacherName: teacher?.name,
        meetingPlatform: booking.meetingPlatform,
        meetingLink: booking.meetingLink,
        preferredTrialTime: booking.preferredTrialTime,
    });
    const admission = await StudentAdmissionApplication_1.StudentAdmissionApplication.create({
        fullName: studentName,
        email,
        whatsapp: booking.whatsapp,
        formData,
        locale,
        status: "reviewing",
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
    if (booking.status !== "closed") {
        booking.status = "closed";
    }
    await booking.save();
    const prefillUrl = `${(0, resolveAuthOrigin_1.getPublicSiteBaseUrl)()}/student-admission?prefill=${prefillToken}`;
    return {
        booking: (0, trialBookingService_1.formatTrialBooking)(booking),
        admission: (0, studentAdmissionService_1.formatStudentAdmission)(admission),
        prefillUrl,
        portalAdmissionPath: `${(0, resolveAuthOrigin_1.getPortalBaseUrl)()}/admin/student-admissions`,
    };
}
async function getAdmissionPrefillByToken(token) {
    const trimmed = token.trim();
    if (!trimmed)
        return { error: "Prefill token is required." };
    const application = await StudentAdmissionApplication_1.StudentAdmissionApplication.findOne({
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
async function completePrefilledAdmission(token, input) {
    const application = await StudentAdmissionApplication_1.StudentAdmissionApplication.findOne({
        prefillToken: token.trim(),
        convertedFromTrial: true,
    });
    if (!application) {
        return { error: "Prefill link is invalid or expired." };
    }
    if (application.formData.admissionPaymentProofUrl) {
        return { error: "This admission application has already been submitted." };
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
    if (!feeMethod || !feeReference || !feeDate || !feeAmount || !proofUrl) {
        return { error: "Admission fee payment details and proof are required." };
    }
    const passwordResult = (0, applicationPassword_1.readApplicationPassword)(input.formData);
    if ("error" in passwordResult)
        return passwordResult;
    application.passwordHash = await (0, applicationPassword_1.hashApplicationPassword)(passwordResult.password);
    application.fullName = input.fullName.trim();
    application.email = input.email.trim().toLowerCase();
    application.whatsapp = input.whatsapp.trim();
    application.formData = {
        ...(0, applicationPassword_1.stripPasswordFields)(application.formData ?? {}),
        ...(0, applicationPassword_1.stripPasswordFields)(input.formData),
        prefillToken: token.trim(),
    };
    application.status = "new";
    application.paymentStatus = "pending";
    application.adminNote =
        `${application.adminNote ?? ""}\nPayment submitted via trial prefill link.`.trim();
    const enrollmentDefaults = (0, studentAdmissionService_1.buildEnrollmentDefaultsFromFormData)({
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
        ? await TrialBooking_1.TrialBooking.findById(application.sourceTrialBookingId)
        : null;
    if (trial?.convertedUserId) {
        const user = await User_1.User.findById(trial.convertedUserId);
        if (user) {
            if (application.passwordHash) {
                user.password = application.passwordHash;
            }
            await (0, userProfileSyncService_1.syncUserFromAdmission)(user, application);
        }
    }
    else {
        const parentInfo = (0, parentInfoFromFormData_1.extractParentInfoFromFormData)(application.formData);
        const user = await User_1.User.findOne({
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
    return { application: (0, studentAdmissionService_1.formatStudentAdmission)(application) };
}
function findPrefilledAdmissionByToken(token) {
    return StudentAdmissionApplication_1.StudentAdmissionApplication.findOne({
        prefillToken: token.trim(),
        convertedFromTrial: true,
    });
}
