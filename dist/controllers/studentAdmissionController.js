"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAdminStudentAdmission = exports.patchAdminStudentAdmissionEnrollment = exports.patchAdminStudentAdmissionPaymentStatus = exports.patchAdminStudentAdmissionStatus = exports.listAdminStudentAdmissions = exports.getPublicAdmissionPrefill = exports.submitStudentAdmission = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const cloudinaryUploadService_1 = require("../services/cloudinaryUploadService");
const studentAdmissionService_1 = require("../services/studentAdmissionService");
const trialMeetingPlatform_1 = require("../lib/trialMeetingPlatform");
const trialConversionService_1 = require("../services/trialConversionService");
function parseLocale(value) {
    if (value === "en" || value === "bn")
        return value;
    return undefined;
}
function parseStatus(value) {
    if (value === "pending" ||
        value === "reviewing" ||
        value === "approved" ||
        value === "rejected") {
        return value;
    }
    return undefined;
}
function parseFormData(raw) {
    if (typeof raw === "string") {
        try {
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === "object" && !Array.isArray(parsed)
                ? parsed
                : null;
        }
        catch {
            return null;
        }
    }
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
        return raw;
    }
    return null;
}
const submitStudentAdmission = async (req, res) => {
    try {
        const files = req.files;
        const admissionFile = files?.admissionPaymentProof?.[0] ??
            (req.file?.fieldname === "admissionPaymentProof" ? req.file : undefined);
        const monthlyFile = files?.monthlyTuitionProof?.[0];
        const body = parseFormData(req.body.data ?? req.body) ?? {};
        const fullName = typeof body.fullName === "string"
            ? body.fullName
            : typeof body.name === "string"
                ? body.name
                : "";
        let proofUpload;
        let monthlyProofUpload;
        try {
            if (admissionFile) {
                proofUpload = await (0, cloudinaryUploadService_1.uploadApplicationFile)(admissionFile.buffer, "student-admissions/payment-proofs", admissionFile.mimetype || "image/jpeg", "image", admissionFile.originalname);
            }
            if (monthlyFile) {
                monthlyProofUpload = await (0, cloudinaryUploadService_1.uploadApplicationFile)(monthlyFile.buffer, "student-admissions/monthly-tuition-proofs", monthlyFile.mimetype || "image/jpeg", "image", monthlyFile.originalname);
            }
        }
        catch (uploadErr) {
            const message = uploadErr instanceof Error &&
                uploadErr.message === "CLOUDINARY_NOT_CONFIGURED"
                ? "File upload is not configured on the server"
                : "Failed to upload payment proof";
            res.status(503).json({ success: false, message, data: null });
            return;
        }
        const formData = {
            ...body,
            ...(proofUpload
                ? {
                    admissionPaymentProofUrl: proofUpload.url,
                    admissionPaymentProofPublicId: proofUpload.publicId,
                }
                : {}),
            ...(monthlyProofUpload
                ? {
                    monthlyTuitionProofUrl: monthlyProofUpload.url,
                    monthlyTuitionProofPublicId: monthlyProofUpload.publicId,
                }
                : {}),
        };
        delete formData.admissionPaymentProofFile;
        delete formData.monthlyTuitionProofFile;
        const prefillToken = typeof body.prefillToken === "string" ? body.prefillToken.trim() : "";
        if (prefillToken) {
            if (!proofUpload?.url) {
                res.status(400).json({
                    success: false,
                    message: "Payment proof screenshot is required.",
                    data: null,
                });
                return;
            }
            const result = await (0, trialConversionService_1.completePrefilledAdmission)(prefillToken, {
                fullName,
                email: typeof body.email === "string" ? body.email : "",
                whatsapp: typeof body.whatsapp === "string" ? body.whatsapp : "",
                formData,
            });
            if ("error" in result) {
                res.status(400).json({ success: false, message: result.error, data: null });
                return;
            }
            res.status(200).json({
                success: true,
                message: "Admission application completed. We will verify your payment and contact you within 24–48 hours.",
                data: { id: result.application._id, status: result.application.status },
            });
            return;
        }
        const result = await (0, studentAdmissionService_1.createStudentAdmissionApplication)({
            fullName,
            email: typeof body.email === "string" ? body.email : "",
            whatsapp: typeof body.whatsapp === "string" ? body.whatsapp : "",
            formData,
            locale: parseLocale(body.locale),
        });
        if ("error" in result) {
            res.status(400).json({ success: false, message: result.error, data: null });
            return;
        }
        const { application } = result;
        res.status(201).json({
            success: true,
            message: "Admission application received. We will verify your payment and contact you within 24–48 hours.",
            data: { id: application._id, status: application.status },
        });
    }
    catch (err) {
        console.error("[admission] submit failed:", err);
        res.status(500).json({
            success: false,
            message: "Failed to submit admission application",
            data: null,
        });
    }
};
exports.submitStudentAdmission = submitStudentAdmission;
const getPublicAdmissionPrefill = async (req, res) => {
    try {
        const token = typeof req.params.token === "string" ? req.params.token : "";
        const result = await (0, trialConversionService_1.getAdmissionPrefillByToken)(token);
        if ("error" in result) {
            res.status(404).json({ success: false, message: result.error, data: null });
            return;
        }
        res.status(200).json({
            success: true,
            message: "Admission prefill loaded",
            data: result,
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to load admission prefill",
            data: null,
        });
    }
};
exports.getPublicAdmissionPrefill = getPublicAdmissionPrefill;
const listAdminStudentAdmissions = async (req, res) => {
    try {
        const status = parseStatus(req.query.status);
        if (req.query.status && !status) {
            res.status(400).json({
                success: false,
                message: "Invalid status filter",
                data: null,
            });
            return;
        }
        const data = await (0, studentAdmissionService_1.listStudentAdmissionApplications)(status);
        res.status(200).json({
            success: true,
            message: "Student admission applications fetched",
            data,
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch admission applications",
            data: null,
        });
    }
};
exports.listAdminStudentAdmissions = listAdminStudentAdmissions;
const patchAdminStudentAdmissionStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const status = parseStatus(req.body.status);
        const adminNote = typeof req.body.adminNote === "string" ? req.body.adminNote : undefined;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid application ID",
                data: null,
            });
            return;
        }
        if (!status) {
            res.status(400).json({
                success: false,
                message: "status must be pending, reviewing, approved, or rejected",
                data: null,
            });
            return;
        }
        const result = await (0, studentAdmissionService_1.updateStudentAdmissionStatus)(id, status, adminNote);
        if ("error" in result) {
            const statusCode = result.error === "Application not found" ? 404 : 400;
            res.status(statusCode).json({ success: false, message: result.error, data: null });
            return;
        }
        res.status(200).json({
            success: true,
            message: status === "approved"
                ? "Admission approved — student portal account is active"
                : "Admission application updated",
            data: result.application,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || "Failed to update admission application",
            data: null,
        });
    }
};
exports.patchAdminStudentAdmissionStatus = patchAdminStudentAdmissionStatus;
function parsePaymentStatus(value) {
    if (value === "pending" || value === "verified" || value === "rejected") {
        return value;
    }
    return undefined;
}
function parseClassDays(value) {
    if (!Array.isArray(value))
        return undefined;
    const allowed = new Set([
        "Saturday",
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
    ]);
    return value.filter((day) => typeof day === "string" && allowed.has(day));
}
const patchAdminStudentAdmissionPaymentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const paymentStatus = parsePaymentStatus(req.body.paymentStatus);
        const rejectReason = typeof req.body.rejectReason === "string" ? req.body.rejectReason : undefined;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid application ID",
                data: null,
            });
            return;
        }
        if (!paymentStatus) {
            res.status(400).json({
                success: false,
                message: "paymentStatus must be pending, verified, or rejected",
                data: null,
            });
            return;
        }
        const result = await (0, studentAdmissionService_1.updateAdmissionPaymentStatus)(id, paymentStatus, rejectReason);
        if ("error" in result) {
            const statusCode = result.error === "Application not found" ? 404 : 400;
            res.status(statusCode).json({ success: false, message: result.error, data: null });
            return;
        }
        res.status(200).json({
            success: true,
            message: "Admission payment status updated",
            data: result.application,
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to update payment status",
            data: null,
        });
    }
};
exports.patchAdminStudentAdmissionPaymentStatus = patchAdminStudentAdmissionPaymentStatus;
const patchAdminStudentAdmissionEnrollment = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid application ID",
                data: null,
            });
            return;
        }
        const payload = {};
        if (typeof req.body.classStartDate === "string") {
            payload.classStartDate = req.body.classStartDate;
        }
        const classDays = parseClassDays(req.body.classDays);
        if (classDays !== undefined)
            payload.classDays = classDays;
        if (req.body.classesPerWeek !== undefined) {
            payload.classesPerWeek = Number(req.body.classesPerWeek);
        }
        if (req.body.classDurationMinutes !== undefined) {
            payload.classDurationMinutes = Number(req.body.classDurationMinutes);
        }
        if (typeof req.body.classTimeHour === "string") {
            payload.classTimeHour = req.body.classTimeHour;
        }
        if (typeof req.body.classTimeMinute === "string") {
            payload.classTimeMinute = req.body.classTimeMinute;
        }
        if (req.body.classTimePeriod === "AM" || req.body.classTimePeriod === "PM") {
            payload.classTimePeriod = req.body.classTimePeriod;
        }
        if (typeof req.body.assignedTeacherSlug === "string") {
            payload.assignedTeacherSlug = req.body.assignedTeacherSlug;
        }
        const platform = (0, trialMeetingPlatform_1.parseTrialMeetingPlatform)(req.body.meetingPlatform);
        if (req.body.meetingPlatform !== undefined) {
            payload.meetingPlatform = platform;
        }
        if (typeof req.body.meetingLink === "string") {
            payload.meetingLink = req.body.meetingLink;
        }
        if (req.body.monthlyFeeAmount !== undefined) {
            payload.monthlyFeeAmount = Number(req.body.monthlyFeeAmount);
        }
        if (req.body.monthlyFeeCurrency === "bdt" || req.body.monthlyFeeCurrency === "usd") {
            payload.monthlyFeeCurrency = req.body.monthlyFeeCurrency;
        }
        const result = await (0, studentAdmissionService_1.updateAdmissionEnrollment)(id, payload);
        if ("error" in result) {
            const statusCode = result.error === "Application not found" ? 404 : 400;
            res.status(statusCode).json({ success: false, message: result.error, data: null });
            return;
        }
        res.status(200).json({
            success: true,
            message: "Enrollment setup saved",
            data: result.application,
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to save enrollment setup",
            data: null,
        });
    }
};
exports.patchAdminStudentAdmissionEnrollment = patchAdminStudentAdmissionEnrollment;
const deleteAdminStudentAdmission = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid application ID",
                data: null,
            });
            return;
        }
        const result = await (0, studentAdmissionService_1.deleteStudentAdmissionApplication)(id);
        if ("error" in result) {
            res.status(404).json({ success: false, message: result.error, data: null });
            return;
        }
        res.status(200).json({
            success: true,
            message: "Admission application deleted",
            data: null,
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to delete admission application",
            data: null,
        });
    }
};
exports.deleteAdminStudentAdmission = deleteAdminStudentAdmission;
