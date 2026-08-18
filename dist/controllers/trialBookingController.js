"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAdminTrialBooking = exports.postAdminConvertTrialToAdmission = exports.postAdminSendTrialInvitation = exports.patchAdminTrialBooking = exports.patchAdminTrialBookingStatus = exports.listAdminTrialBookings = exports.submitTrialBooking = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const trialBookingService_1 = require("../services/trialBookingService");
const trialConversionService_1 = require("../services/trialConversionService");
const trialMeetingPlatform_1 = require("../lib/trialMeetingPlatform");
function parseLearnerType(value) {
    if (value === "child" || value === "teen" || value === "adult")
        return value;
    return undefined;
}
function parseTimeSlot(value) {
    const slots = [
        "anytime",
        "early_morning",
        "morning",
        "afternoon",
        "evening",
        "late_evening",
    ];
    if (typeof value === "string" && slots.includes(value)) {
        return value;
    }
    return undefined;
}
function parseTeacherPreference(value) {
    if (value === "any" || value === "female" || value === "male")
        return value;
    return undefined;
}
function parseBookingStatus(value) {
    if (value === "new" || value === "contacted" || value === "scheduled" || value === "closed") {
        return value;
    }
    return undefined;
}
function parseLearnerGender(value) {
    if (value === "male" || value === "female")
        return value;
    return undefined;
}
const submitTrialBooking = async (req, res) => {
    try {
        const learnerType = parseLearnerType(req.body.learnerType);
        if (!learnerType) {
            res.status(400).json({
                success: false,
                message: "learnerType is required (child, teen, or adult)",
                data: null,
            });
            return;
        }
        const preferredDays = Array.isArray(req.body.preferredDays)
            ? req.body.preferredDays.filter((d) => typeof d === "string")
            : [];
        const result = await (0, trialBookingService_1.createTrialBooking)({
            parentName: req.body.parentName,
            studentName: req.body.studentName,
            email: req.body.email,
            whatsapp: req.body.whatsapp,
            country: req.body.country,
            age: typeof req.body.age === "string" ? req.body.age : undefined,
            learnerGender: parseLearnerGender(req.body.learnerGender),
            learnerType,
            preferredTrialDate: typeof req.body.preferredTrialDate === "string"
                ? req.body.preferredTrialDate
                : undefined,
            preferredTrialTime: typeof req.body.preferredTrialTime === "string"
                ? req.body.preferredTrialTime
                : undefined,
            additionalNote: typeof req.body.additionalNote === "string" ? req.body.additionalNote : undefined,
            timeSlot: parseTimeSlot(req.body.timeSlot),
            teacherPreference: parseTeacherPreference(req.body.teacherPreference),
            preferredDays,
            timezone: typeof req.body.timezone === "string" ? req.body.timezone : undefined,
            source: req.body.source,
            courseSlug: req.body.courseSlug,
            teacherSlug: req.body.teacherSlug,
            utmSource: req.body.utmSource,
            utmMedium: req.body.utmMedium,
            utmCampaign: req.body.utmCampaign,
            utmContent: req.body.utmContent,
        });
        if ("error" in result) {
            res.status(400).json({ success: false, message: result.error, data: null });
            return;
        }
        const { booking } = result;
        res.status(201).json({
            success: true,
            message: "Trial booking received. We'll contact you within 24 hours.",
            data: { id: booking._id, status: booking.status },
        });
    }
    catch (err) {
        console.error("[trial] submit failed:", err);
        res.status(500).json({
            success: false,
            message: "Failed to submit trial booking",
            data: null,
        });
    }
};
exports.submitTrialBooking = submitTrialBooking;
const listAdminTrialBookings = async (req, res) => {
    try {
        const status = parseBookingStatus(req.query.status);
        if (req.query.status && !status) {
            res.status(400).json({
                success: false,
                message: "Invalid status filter",
                data: null,
            });
            return;
        }
        const data = await (0, trialBookingService_1.listTrialBookings)(status);
        res.status(200).json({
            success: true,
            message: "Trial bookings fetched",
            data,
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch trial bookings",
            data: null,
        });
    }
};
exports.listAdminTrialBookings = listAdminTrialBookings;
const patchAdminTrialBookingStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const status = parseBookingStatus(req.body.status);
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid booking ID",
                data: null,
            });
            return;
        }
        if (!status) {
            res.status(400).json({
                success: false,
                message: "status must be new, contacted, scheduled, or closed",
                data: null,
            });
            return;
        }
        const result = await (0, trialBookingService_1.updateTrialBookingStatus)(id, status);
        if ("error" in result) {
            res.status(404).json({ success: false, message: result.error, data: null });
            return;
        }
        res.status(200).json({
            success: true,
            message: "Trial booking updated",
            data: result.booking,
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to update trial booking",
            data: null,
        });
    }
};
exports.patchAdminTrialBookingStatus = patchAdminTrialBookingStatus;
const patchAdminTrialBooking = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid booking ID",
                data: null,
            });
            return;
        }
        const preferredDays = Array.isArray(req.body.preferredDays)
            ? req.body.preferredDays.filter((d) => typeof d === "string")
            : undefined;
        const result = await (0, trialBookingService_1.updateTrialBooking)(id, {
            parentName: typeof req.body.parentName === "string" ? req.body.parentName : undefined,
            studentName: typeof req.body.studentName === "string" ? req.body.studentName : undefined,
            email: typeof req.body.email === "string" ? req.body.email : undefined,
            whatsapp: typeof req.body.whatsapp === "string" ? req.body.whatsapp : undefined,
            country: typeof req.body.country === "string" ? req.body.country : undefined,
            age: typeof req.body.age === "string" ? req.body.age : undefined,
            learnerGender: parseLearnerGender(req.body.learnerGender),
            learnerType: parseLearnerType(req.body.learnerType),
            preferredTrialDate: typeof req.body.preferredTrialDate === "string"
                ? req.body.preferredTrialDate
                : undefined,
            preferredTrialTime: typeof req.body.preferredTrialTime === "string"
                ? req.body.preferredTrialTime
                : undefined,
            additionalNote: typeof req.body.additionalNote === "string" ? req.body.additionalNote : undefined,
            timeSlot: parseTimeSlot(req.body.timeSlot),
            teacherPreference: parseTeacherPreference(req.body.teacherPreference),
            preferredDays,
            timezone: typeof req.body.timezone === "string" ? req.body.timezone : undefined,
            courseSlug: typeof req.body.courseSlug === "string" ? req.body.courseSlug : undefined,
            teacherSlug: typeof req.body.teacherSlug === "string" ? req.body.teacherSlug : undefined,
            meetingPlatform: (0, trialMeetingPlatform_1.parseTrialMeetingPlatform)(req.body.meetingPlatform),
            meetingLink: typeof req.body.meetingLink === "string" ? req.body.meetingLink : undefined,
            status: parseBookingStatus(req.body.status),
        });
        if ("error" in result) {
            const statusCode = result.error === "Trial booking not found" ? 404 : 400;
            res.status(statusCode).json({ success: false, message: result.error, data: null });
            return;
        }
        res.status(200).json({
            success: true,
            message: "Trial booking updated",
            data: result.booking,
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to update trial booking",
            data: null,
        });
    }
};
exports.patchAdminTrialBooking = patchAdminTrialBooking;
const postAdminSendTrialInvitation = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid booking ID",
                data: null,
            });
            return;
        }
        const result = await (0, trialBookingService_1.sendTrialInvitation)(id, {
            teacherSlug: typeof req.body.teacherSlug === "string" ? req.body.teacherSlug : undefined,
            meetingPlatform: (0, trialMeetingPlatform_1.parseTrialMeetingPlatform)(req.body.meetingPlatform),
            meetingLink: typeof req.body.meetingLink === "string" ? req.body.meetingLink : undefined,
        });
        if ("error" in result) {
            const statusCode = result.error === "Trial booking not found" ? 404 : 400;
            res.status(statusCode).json({ success: false, message: result.error, data: null });
            return;
        }
        res.status(200).json({
            success: true,
            message: "Trial invitation prepared",
            data: result,
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to send trial invitation",
            data: null,
        });
    }
};
exports.postAdminSendTrialInvitation = postAdminSendTrialInvitation;
const postAdminConvertTrialToAdmission = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid booking ID",
                data: null,
            });
            return;
        }
        const result = await (0, trialConversionService_1.convertTrialToAdmission)(id, {
            email: typeof req.body.email === "string" ? req.body.email : "",
            locale: req.body.locale === "bn" ? "bn" : req.body.locale === "en" ? "en" : undefined,
        });
        if ("error" in result) {
            const statusCode = result.error === "Trial booking not found" ? 404 : 400;
            res.status(statusCode).json({ success: false, message: result.error, data: null });
            return;
        }
        res.status(201).json({
            success: true,
            message: "Trial lead converted to admission",
            data: result,
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to convert trial lead",
            data: null,
        });
    }
};
exports.postAdminConvertTrialToAdmission = postAdminConvertTrialToAdmission;
const deleteAdminTrialBooking = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid booking ID",
                data: null,
            });
            return;
        }
        const result = await (0, trialBookingService_1.deleteTrialBooking)(id);
        if ("error" in result) {
            res.status(404).json({ success: false, message: result.error, data: null });
            return;
        }
        res.status(200).json({
            success: true,
            message: "Trial booking deleted",
            data: null,
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to delete trial booking",
            data: null,
        });
    }
};
exports.deleteAdminTrialBooking = deleteAdminTrialBooking;
