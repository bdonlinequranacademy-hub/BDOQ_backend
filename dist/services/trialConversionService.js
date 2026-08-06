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
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const TrialBooking_1 = require("../models/TrialBooking");
const StudentAdmissionApplication_1 = require("../models/StudentAdmissionApplication");
const User_1 = require("../models/User");
const TeacherProfile_1 = require("../models/TeacherProfile");
const trialToAdmissionMapper_1 = require("../lib/trialToAdmissionMapper");
const studentAdmissionService_1 = require("./studentAdmissionService");
const trialBookingService_1 = require("./trialBookingService");
const whatsappPhone_1 = require("../lib/whatsappPhone");
const studentId_1 = require("../utils/studentId");
const resolveAuthOrigin_1 = require("../lib/email/resolveAuthOrigin");
const emailService_1 = require("./emailService");
const brandEmailTemplate_1 = require("../lib/email/brandEmailTemplate");
const emailConfig_1 = require("../lib/email/emailConfig");
const userProfileSyncService_1 = require("./userProfileSyncService");
const parentInfoFromFormData_1 = require("../lib/parentInfoFromFormData");
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function generateToken() {
    return crypto_1.default.randomBytes(24).toString("hex");
}
function generateTemporaryPassword() {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
    let password = "";
    for (let i = 0; i < 10; i += 1) {
        password += chars[Math.floor(Math.random() * chars.length)];
    }
    return password;
}
async function sendStudentWelcomeEmail(email, name, temporaryPassword) {
    const loginUrl = `${(0, resolveAuthOrigin_1.getPortalBaseUrl)()}/login`;
    const content = {
        title: "Your student portal account is ready",
        greeting: `Assalamu Alaikum ${name},`,
        messageBody: [
            `Welcome to ${emailConfig_1.EMAIL_BRAND.legalName}.`,
            "",
            "Your student portal account has been created after your free trial class.",
            "",
            `Email: ${email}`,
            `Temporary password: ${temporaryPassword}`,
            "",
            "Please sign in and change your password after first login.",
        ].join("\n"),
        buttonText: "Sign in to portal",
        buttonLink: loginUrl,
        preheader: "Your BDOQ Academy student account is ready",
    };
    await (0, emailService_1.sendEmail)({
        to: email,
        subject: `Welcome to ${emailConfig_1.EMAIL_BRAND.name} — Student Portal`,
        text: (0, brandEmailTemplate_1.buildBrandEmailText)(content),
        html: (0, brandEmailTemplate_1.buildBrandEmailHtml)(content),
    }).catch((err) => {
        console.warn("[trial-convert] Welcome email failed:", err);
    });
}
async function createStudentUserFromTrial(booking, email) {
    const studentName = booking.studentName?.trim() || booking.parentName;
    const country = booking.country?.trim() || "Bangladesh";
    const existing = await User_1.User.findOne({ email: email.toLowerCase() });
    if (existing) {
        return { error: "A portal user with this email already exists." };
    }
    const normalizedWa = (0, whatsappPhone_1.normalizeWhatsAppForStorage)(booking.whatsapp, country);
    if (!normalizedWa.ok) {
        return { error: normalizedWa.error };
    }
    const temporaryPassword = generateTemporaryPassword();
    const hashedPassword = await bcryptjs_1.default.hash(temporaryPassword, 10);
    const user = await User_1.User.create({
        name: studentName,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: "student",
        emailVerified: true,
        country,
        timezone: booking.timezone?.trim() || "Asia/Dhaka",
        whatsapp: normalizedWa.whatsapp,
        studentId: await (0, studentId_1.generateStudentId)(),
        gender: booking.learnerGender,
        parentInfo: {
            name: booking.parentName?.trim() || undefined,
            relationship: "Parent/Guardian",
            whatsapp: normalizedWa.whatsapp,
            email: email.toLowerCase(),
        },
    });
    return { user, temporaryPassword };
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
    const teacher = booking.teacherSlug?.trim()
        ? await TeacherProfile_1.TeacherProfile.findOne({ slug: booking.teacherSlug.trim() })
        : null;
    const studentName = booking.studentName?.trim() || booking.parentName;
    const formData = (0, trialToAdmissionMapper_1.buildAdmissionFormDataFromTrial)({
        booking,
        email,
        teacherName: teacher?.name,
    });
    const prefillToken = generateToken();
    const locale = input.locale === "bn" ? "bn" : input.locale === "en" ? "en" : undefined;
    const enrollmentDefaults = (0, studentAdmissionService_1.buildEnrollmentDefaultsFromFormData)(formData, {
        teacherSlug: booking.teacherSlug,
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
    let createdUser;
    const shouldCreateUser = input.createUser !== false;
    if (shouldCreateUser) {
        const userResult = await createStudentUserFromTrial(booking, email);
        if ("error" in userResult) {
            await StudentAdmissionApplication_1.StudentAdmissionApplication.findByIdAndDelete(admission._id);
            return { error: userResult.error };
        }
        createdUser = userResult;
        booking.convertedUserId = userResult.user._id;
        await (0, userProfileSyncService_1.syncUserFromAdmission)(userResult.user, admission);
        await sendStudentWelcomeEmail(email, studentName, userResult.temporaryPassword);
    }
    booking.convertedAdmissionId = admission._id;
    booking.convertedAt = new Date();
    if (booking.status !== "closed") {
        booking.status = "closed";
    }
    await booking.save();
    const prefillUrl = `${(0, resolveAuthOrigin_1.getPublicSiteBaseUrl)()}/student-admission?prefill=${prefillToken}`;
    return {
        booking: (0, trialBookingService_1.formatTrialBooking)(booking),
        admission: (0, studentAdmissionService_1.formatStudentAdmission)(admission),
        user: createdUser
            ? {
                _id: createdUser.user._id.toString(),
                email: createdUser.user.email,
                temporaryPassword: createdUser.temporaryPassword,
            }
            : undefined,
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
    application.fullName = input.fullName.trim();
    application.email = input.email.trim().toLowerCase();
    application.whatsapp = input.whatsapp.trim();
    application.formData = {
        ...application.formData,
        ...input.formData,
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
