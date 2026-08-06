"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.linkAdmissionToUser = linkAdmissionToUser;
exports.syncUserFromAdmission = syncUserFromAdmission;
exports.syncUserFromAdmissionByEmail = syncUserFromAdmissionByEmail;
exports.buildEnrollmentSummaryFromAdmission = buildEnrollmentSummaryFromAdmission;
const mongoose_1 = __importDefault(require("mongoose"));
const User_1 = require("../models/User");
const StudentAdmissionApplication_1 = require("../models/StudentAdmissionApplication");
const parentInfoFromFormData_1 = require("../lib/parentInfoFromFormData");
async function linkAdmissionToUser(admission, userId) {
    admission.linkedUserId = new mongoose_1.default.Types.ObjectId(String(userId));
    await admission.save();
}
async function syncUserFromAdmission(user, admission) {
    const parentInfo = (0, parentInfoFromFormData_1.extractParentInfoFromFormData)(admission.formData);
    if (parentInfo) {
        user.parentInfo = parentInfo;
    }
    if (!user.country && typeof admission.formData.currentCountry === "string") {
        user.country = admission.formData.currentCountry.trim();
    }
    if (!user.gender && (admission.formData.gender === "male" || admission.formData.gender === "female")) {
        user.gender = admission.formData.gender;
    }
    user.sourceAdmissionId = admission._id;
    await user.save();
    if (!admission.linkedUserId) {
        await linkAdmissionToUser(admission, user._id);
    }
    return user;
}
async function syncUserFromAdmissionByEmail(email) {
    const normalized = email.trim().toLowerCase();
    if (!normalized)
        return null;
    const user = await User_1.User.findOne({ email: normalized, role: "student" });
    if (!user)
        return null;
    const admission = await StudentAdmissionApplication_1.StudentAdmissionApplication.findOne({
        email: normalized,
    }).sort({ createdAt: -1 });
    if (!admission)
        return user;
    return syncUserFromAdmission(user, admission);
}
function buildEnrollmentSummaryFromAdmission(admission) {
    return {
        admissionId: admission._id.toString(),
        packagePlan: typeof admission.formData.packagePlan === "string"
            ? admission.formData.packagePlan
            : undefined,
        classStartDate: admission.classStartDate,
        classDays: admission.classDays ?? [],
        classesPerWeek: admission.classesPerWeek,
        classDurationMinutes: admission.classDurationMinutes,
        classTime: admission.classTime,
        assignedTeacherName: admission.assignedTeacherName,
        assignedTeacherSlug: admission.assignedTeacherSlug,
        meetingPlatform: admission.meetingPlatform,
        meetingLink: admission.meetingLink,
        monthlyFeeAmount: admission.monthlyFeeAmount,
        monthlyFeeCurrency: admission.monthlyFeeCurrency,
        paymentStatus: admission.paymentStatus,
        convertedFromTrial: admission.convertedFromTrial ?? false,
    };
}
