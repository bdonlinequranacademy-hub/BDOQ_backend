"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStudentProfileHub = exports.changeStudentPassword = exports.updateMyApplicationData = exports.updateStudentProfile = exports.getStudentProfile = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const User_1 = require("../models/User");
const Class_1 = require("../models/Class");
const Attendance_1 = require("../models/Attendance");
const Progress_1 = require("../models/Progress");
const PaymentRecord_1 = require("../models/PaymentRecord");
const StudentBilling_1 = require("../models/StudentBilling");
const StudentAdmissionApplication_1 = require("../models/StudentAdmissionApplication");
const whatsappPhone_1 = require("../lib/whatsappPhone");
const avatarFields_1 = require("../lib/avatarFields");
const userProfileSyncService_1 = require("../services/userProfileSyncService");
function toProfileView(user) {
    return {
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        studentId: user.studentId ?? undefined,
        timezone: user.timezone || "Asia/Dhaka",
        country: user.country || "",
        whatsapp: user.whatsapp || "",
        ...(0, avatarFields_1.avatarFieldsFromUser)(user),
        gender: user.gender,
        parentInfo: user.parentInfo ?? undefined,
    };
}
const getStudentProfile = async (req, res) => {
    try {
        const user = await User_1.User.findById(req.user._id).select("name email role studentId timezone country whatsapp avatarUrl gender parentInfo sourceAdmissionId");
        if (!user) {
            res.status(404).json({
                success: false,
                message: "User not found",
                data: null,
            });
            return;
        }
        let applicationData = null;
        let applicationId = null;
        if (user.sourceAdmissionId) {
            const admission = await StudentAdmissionApplication_1.StudentAdmissionApplication.findById(user.sourceAdmissionId).select("formData").lean();
            if (admission) {
                applicationData = admission.formData;
                applicationId = String(admission._id);
            }
        }
        res.status(200).json({
            success: true,
            message: "Profile fetched successfully",
            data: {
                ...toProfileView(user),
                applicationData,
                applicationId,
            },
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch profile",
            data: null,
        });
    }
};
exports.getStudentProfile = getStudentProfile;
const updateStudentProfile = async (req, res) => {
    try {
        const { name, timezone, country, whatsapp } = req.body;
        const update = {};
        if (typeof name === "string" && name.trim())
            update.name = name.trim();
        if (typeof timezone === "string" && timezone.trim()) {
            update.timezone = timezone.trim();
        }
        if (typeof country === "string")
            update.country = country.trim();
        if (whatsapp !== undefined) {
            const countryHint = typeof country === "string" ? country.trim() : req.user?.country;
            const normalized = (0, whatsappPhone_1.normalizeWhatsAppForStorage)(whatsapp, countryHint);
            if (!normalized.ok) {
                res.status(400).json({
                    success: false,
                    message: normalized.error,
                    data: null,
                });
                return;
            }
            update.whatsapp = normalized.whatsapp;
        }
        const user = await User_1.User.findByIdAndUpdate(req.user._id, update, {
            new: true,
            runValidators: true,
        }).select("name email role studentId timezone country whatsapp parentInfo gender avatarUrl");
        if (!user) {
            res.status(404).json({
                success: false,
                message: "User not found",
                data: null,
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            data: toProfileView(user),
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to update profile",
            data: null,
        });
    }
};
exports.updateStudentProfile = updateStudentProfile;
const updateMyApplicationData = async (req, res) => {
    try {
        const { applicationId, applicationData } = req.body;
        if (!applicationId || !applicationData) {
            res.status(400).json({
                success: false,
                message: "Missing application ID or data",
                data: null,
            });
            return;
        }
        const application = await StudentAdmissionApplication_1.StudentAdmissionApplication.findById(applicationId);
        if (!application) {
            res.status(404).json({
                success: false,
                message: "Application not found",
                data: null,
            });
            return;
        }
        // Verify ownership
        if (String(application.linkedUserId) !== String(req.user._id)) {
            res.status(403).json({
                success: false,
                message: "Not authorized to update this application",
                data: null,
            });
            return;
        }
        // Replace old data with new data entirely to support deletion of fields
        application.formData = applicationData;
        application.markModified("formData");
        await application.save();
        res.status(200).json({
            success: true,
            message: "Application data updated successfully",
            data: application.formData,
        });
    }
    catch (err) {
        console.error("[student] updateMyApplicationData failed:", err);
        res.status(500).json({
            success: false,
            message: "Failed to update application data",
            data: null,
        });
    }
};
exports.updateMyApplicationData = updateMyApplicationData;
const changeStudentPassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword || String(newPassword).length < 6) {
            res.status(400).json({
                success: false,
                message: "Current password and new password (min 6 chars) are required",
                data: null,
            });
            return;
        }
        const user = await User_1.User.findById(req.user._id);
        if (!user) {
            res.status(404).json({
                success: false,
                message: "User not found",
                data: null,
            });
            return;
        }
        const isMatch = await bcryptjs_1.default.compare(currentPassword, user.password);
        if (!isMatch) {
            res.status(401).json({
                success: false,
                message: "Current password is incorrect",
                data: null,
            });
            return;
        }
        user.password = await bcryptjs_1.default.hash(newPassword, 10);
        await user.save();
        res.status(200).json({
            success: true,
            message: "Password changed successfully",
            data: null,
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to change password",
            data: null,
        });
    }
};
exports.changeStudentPassword = changeStudentPassword;
const getStudentProfileHub = async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await User_1.User.findById(userId).select("name email role studentId timezone country whatsapp avatarUrl gender parentInfo sourceAdmissionId");
        if (!user) {
            res.status(404).json({
                success: false,
                message: "User not found",
                data: null,
            });
            return;
        }
        const [classes, attendanceDocs, progressCount, payments, billing, admission] = await Promise.all([
            Class_1.Class.find({ students: userId })
                .select("title schedule meetingLink meetingPlatform isActive teacher")
                .populate("teacher", "name email whatsapp")
                .sort({ createdAt: -1 })
                .lean(),
            Attendance_1.Attendance.find({ student: userId }).select("status").lean(),
            Progress_1.Progress.countDocuments({ student: userId }),
            PaymentRecord_1.PaymentRecord.find({ student: userId })
                .select("amount currency status createdAt")
                .sort({ createdAt: -1 })
                .limit(5)
                .lean(),
            StudentBilling_1.StudentBilling.findOne({ student: userId }).lean(),
            user.sourceAdmissionId
                ? StudentAdmissionApplication_1.StudentAdmissionApplication.findById(user.sourceAdmissionId).lean()
                : StudentAdmissionApplication_1.StudentAdmissionApplication.findOne({ linkedUserId: userId })
                    .sort({ createdAt: -1 })
                    .lean(),
        ]);
        const present = attendanceDocs.filter((a) => a.status === "present").length;
        const late = attendanceDocs.filter((a) => a.status === "late").length;
        const total = attendanceDocs.length;
        const attendanceRate = total > 0 ? Math.round(((present + late) / total) * 100) : null;
        res.status(200).json({
            success: true,
            message: "Profile hub fetched successfully",
            data: {
                profile: {
                    ...toProfileView(user),
                    applicationData: admission ? admission.formData : null,
                    applicationId: admission ? String(admission._id) : null,
                },
                enrollment: admission
                    ? (0, userProfileSyncService_1.buildEnrollmentSummaryFromAdmission)(admission)
                    : null,
                classes: classes.map((cls) => {
                    const teacher = cls.teacher;
                    return {
                        _id: String(cls._id),
                        title: cls.title,
                        schedule: cls.schedule ?? null,
                        meetingLink: cls.meetingLink ?? "",
                        meetingPlatform: cls.meetingPlatform ?? undefined,
                        isActive: cls.isActive !== false,
                        teacherName: teacher?.name ?? "Teacher",
                        teacherEmail: teacher?.email ?? "",
                        teacherWhatsapp: teacher?.whatsapp ?? "",
                    };
                }),
                stats: {
                    activeClasses: classes.filter((c) => c.isActive !== false).length,
                    attendanceRate,
                    progressRecords: progressCount,
                    recentPayments: payments.length,
                },
                billing: billing
                    ? {
                        monthlyFee: billing.monthlyFee,
                        currency: billing.currency,
                        dueDay: billing.dueDayOfMonth,
                        paidUntil: billing.paidUntil,
                        isActive: billing.isActive !== false,
                    }
                    : null,
                recentPayments: payments.map((p) => ({
                    _id: String(p._id),
                    amount: p.amount,
                    currency: p.currency,
                    status: p.status,
                    createdAt: p.createdAt,
                })),
            },
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch profile hub",
            data: null,
        });
    }
};
exports.getStudentProfileHub = getStudentProfileHub;
