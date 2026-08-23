"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.provisionStudentFromAdmission = provisionStudentFromAdmission;
exports.deactivateAdmissionLinkedUser = deactivateAdmissionLinkedUser;
exports.provisionTeacherFromApplication = provisionTeacherFromApplication;
exports.deactivateTeacherLinkedUser = deactivateTeacherLinkedUser;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const User_1 = require("../models/User");
const StudentAdmissionApplication_1 = require("../models/StudentAdmissionApplication");
const TeacherApplication_1 = require("../models/TeacherApplication");
const studentId_1 = require("../utils/studentId");
const whatsappPhone_1 = require("../lib/whatsappPhone");
const parentInfoFromFormData_1 = require("../lib/parentInfoFromFormData");
const userProfileSyncService_1 = require("./userProfileSyncService");
const admissionAdvancePaymentService_1 = require("./admissionAdvancePaymentService");
const emailService_1 = require("./emailService");
const resolveAuthOrigin_1 = require("../lib/email/resolveAuthOrigin");
const brandEmailTemplate_1 = require("../lib/email/brandEmailTemplate");
const emailConfig_1 = require("../lib/email/emailConfig");
function generateTemporaryPassword() {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
    let password = "";
    for (let i = 0; i < 10; i += 1) {
        password += chars[Math.floor(Math.random() * chars.length)];
    }
    return password;
}
function formString(formData, key) {
    if (!formData)
        return "";
    const value = formData[key];
    return typeof value === "string" ? value.trim() : "";
}
function formGender(formData) {
    if (!formData)
        return undefined;
    return formData.gender === "male" || formData.gender === "female"
        ? formData.gender
        : undefined;
}
function storedWhatsApp(raw, country) {
    const normalized = (0, whatsappPhone_1.normalizeWhatsAppForStorage)(raw ?? "", country);
    return normalized.ok && normalized.whatsapp ? normalized.whatsapp : undefined;
}
async function sendWelcomeEmail(input) {
    const loginUrl = `${(0, resolveAuthOrigin_1.getPortalBaseUrl)()}/login`;
    const roleLabel = input.role === "teacher" ? "teacher" : "student";
    const credentialLines = input.temporaryPassword
        ? [
            `Email: ${input.email}`,
            `Temporary password: ${input.temporaryPassword}`,
            "",
            "Please sign in and change your password after first login.",
        ]
        : [
            `Email: ${input.email}`,
            "",
            "Sign in with the password you created on your application form.",
            "If you forgot it, use Forgot password on the login page.",
        ];
    const content = {
        title: `Your ${roleLabel} portal account is ready`,
        greeting: `Assalamu Alaikum ${input.name},`,
        messageBody: [
            `Welcome to ${emailConfig_1.EMAIL_BRAND.legalName}.`,
            "",
            `Your ${roleLabel} portal account has been created after admin approval.`,
            "",
            ...credentialLines,
        ].join("\n"),
        buttonText: "Sign in to portal",
        buttonLink: loginUrl,
        preheader: `Your BDOQ Academy ${roleLabel} account is ready`,
    };
    await (0, emailService_1.sendEmail)({
        to: input.email,
        subject: `Welcome to ${emailConfig_1.EMAIL_BRAND.name} — ${roleLabel === "teacher" ? "Teacher" : "Student"} Portal`,
        text: (0, brandEmailTemplate_1.buildBrandEmailText)(content),
        html: (0, brandEmailTemplate_1.buildBrandEmailHtml)(content),
    }).catch((err) => {
        console.warn(`[lead-portal] Welcome email failed (${input.role}):`, err);
    });
}
async function provisionStudentFromAdmission(application) {
    const email = application.email.trim().toLowerCase();
    const country = formString(application.formData, "currentCountry") ||
        formString(application.formData, "country") ||
        "Bangladesh";
    const timezone = formString(application.formData, "timezone") || "Asia/Dhaka";
    const gender = formGender(application.formData);
    const whatsapp = storedWhatsApp(application.whatsapp, country);
    if (application.linkedUserId) {
        const linked = await User_1.User.findById(application.linkedUserId);
        if (linked && linked.role === "student") {
            linked.isActive = true;
            if (whatsapp && !linked.whatsapp)
                linked.whatsapp = whatsapp;
            if (country && !linked.country)
                linked.country = country;
            await (0, userProfileSyncService_1.syncUserFromAdmission)(linked, application);
            await (0, admissionAdvancePaymentService_1.provisionBillingFromAdmission)(linked, application);
            return { user: linked, created: false };
        }
    }
    const existing = await User_1.User.findOne({ email });
    if (existing) {
        if (existing.role !== "student") {
            existing.role = "student";
            await existing.save();
        }
        existing.isActive = true;
        if (whatsapp && !existing.whatsapp)
            existing.whatsapp = whatsapp;
        if (country && !existing.country)
            existing.country = country;
        await (0, userProfileSyncService_1.syncUserFromAdmission)(existing, application);
        await (0, admissionAdvancePaymentService_1.provisionBillingFromAdmission)(existing, application);
        return { user: existing, created: false };
    }
    const storedHash = typeof application.passwordHash === "string" && application.passwordHash
        ? application.passwordHash
        : (await StudentAdmissionApplication_1.StudentAdmissionApplication.findById(application._id).select("+passwordHash"))?.passwordHash;
    const temporaryPassword = storedHash ? undefined : generateTemporaryPassword();
    const hashedPassword = storedHash ?? (await bcryptjs_1.default.hash(temporaryPassword, 10));
    const user = await User_1.User.create({
        name: application.fullName.trim(),
        email,
        password: hashedPassword,
        role: "student",
        emailVerified: true,
        isActive: true,
        country,
        timezone,
        whatsapp,
        studentId: await (0, studentId_1.generateStudentId)(),
        gender,
        parentInfo: (0, parentInfoFromFormData_1.extractParentInfoFromFormData)(application.formData),
        sourceAdmissionId: application._id,
    });
    application.linkedUserId = user._id;
    await application.save();
    await sendWelcomeEmail({
        email,
        name: application.fullName.trim(),
        role: "student",
        temporaryPassword,
    });
    await (0, admissionAdvancePaymentService_1.provisionBillingFromAdmission)(user, application);
    return { user, created: true };
}
async function deactivateAdmissionLinkedUser(application) {
    if (!application.linkedUserId)
        return;
    await User_1.User.findOneAndUpdate({ _id: application.linkedUserId, role: "student" }, { isActive: false });
}
async function provisionTeacherFromApplication(application) {
    const email = application.email.trim().toLowerCase();
    const country = formString(application.formData, "currentCountry") ||
        formString(application.formData, "country") ||
        formString(application.formData, "nationality") ||
        "Bangladesh";
    const timezone = formString(application.formData, "timezone") || "Asia/Dhaka";
    const gender = formGender(application.formData);
    const whatsapp = storedWhatsApp(application.phone, country);
    if (application.linkedUserId) {
        const linked = await User_1.User.findById(application.linkedUserId);
        if (linked && linked.role === "teacher") {
            linked.isActive = true;
            if (whatsapp && !linked.whatsapp)
                linked.whatsapp = whatsapp;
            if (country && !linked.country)
                linked.country = country;
            if (gender && !linked.gender)
                linked.gender = gender;
            await linked.save();
            return { user: linked, created: false };
        }
    }
    const existing = await User_1.User.findOne({ email });
    if (existing) {
        if (existing.role !== "teacher") {
            existing.role = "teacher";
            await existing.save();
        }
        existing.isActive = true;
        if (whatsapp && !existing.whatsapp)
            existing.whatsapp = whatsapp;
        if (country && !existing.country)
            existing.country = country;
        if (gender && !existing.gender)
            existing.gender = gender;
        application.linkedUserId = existing._id;
        await Promise.all([existing.save(), application.save()]);
        return { user: existing, created: false };
    }
    const storedHash = typeof application.passwordHash === "string" && application.passwordHash
        ? application.passwordHash
        : (await TeacherApplication_1.TeacherApplication.findById(application._id).select("+passwordHash"))?.passwordHash;
    const temporaryPassword = storedHash ? undefined : generateTemporaryPassword();
    const hashedPassword = storedHash ?? (await bcryptjs_1.default.hash(temporaryPassword, 10));
    const user = await User_1.User.create({
        name: application.fullName.trim(),
        email,
        password: hashedPassword,
        role: "teacher",
        emailVerified: true,
        isActive: true,
        country,
        timezone,
        whatsapp,
        gender,
    });
    application.linkedUserId = user._id;
    await application.save();
    await sendWelcomeEmail({
        email,
        name: application.fullName.trim(),
        role: "teacher",
        temporaryPassword,
    });
    return { user, created: true };
}
async function deactivateTeacherLinkedUser(application) {
    if (!application.linkedUserId)
        return;
    await User_1.User.findOneAndUpdate({ _id: application.linkedUserId, role: "teacher" }, { isActive: false });
}
