"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkAvailability = exports.changeTeacherPassword = exports.updateTeacherProfile = exports.getTeacherProfile = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const User_1 = require("../models/User");
const whatsappPhone_1 = require("../lib/whatsappPhone");
const availabilityService_1 = require("../services/availabilityService");
function toProfileView(user) {
    return {
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        timezone: user.timezone || "Asia/Dhaka",
        country: user.country || "",
        meetingLink: user.meetingLink || "",
        bankName: user.bankName || "",
        bankAccount: user.bankAccount || "",
        bKashNumber: user.bKashNumber || "",
        whatsapp: user.whatsapp || "",
    };
}
const getTeacherProfile = async (req, res) => {
    try {
        const user = await User_1.User.findById(req.user._id).select("name email role timezone country meetingLink bankName bankAccount bKashNumber whatsapp");
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
            message: "Profile fetched successfully",
            data: toProfileView(user),
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
exports.getTeacherProfile = getTeacherProfile;
const updateTeacherProfile = async (req, res) => {
    try {
        const { name, timezone, country, meetingLink, bankName, bankAccount, bKashNumber, whatsapp, } = req.body;
        const update = {};
        if (typeof name === "string" && name.trim())
            update.name = name.trim();
        if (typeof timezone === "string" && timezone.trim()) {
            update.timezone = timezone.trim();
        }
        if (typeof country === "string")
            update.country = country.trim();
        if (typeof meetingLink === "string")
            update.meetingLink = meetingLink.trim();
        if (typeof bankName === "string")
            update.bankName = bankName.trim();
        if (typeof bankAccount === "string")
            update.bankAccount = bankAccount.trim();
        if (typeof bKashNumber === "string")
            update.bKashNumber = bKashNumber.trim();
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
        }).select("name email role timezone country meetingLink bankName bankAccount bKashNumber whatsapp");
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
exports.updateTeacherProfile = updateTeacherProfile;
const changeTeacherPassword = async (req, res) => {
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
exports.changeTeacherPassword = changeTeacherPassword;
const checkAvailability = async (req, res) => {
    try {
        const { day, startTime, durationMinutes } = req.body;
        if (!day || !startTime) {
            res.status(400).json({
                success: false,
                message: "day and startTime are required",
                data: null,
            });
            return;
        }
        const duration = typeof durationMinutes === "number" ? durationMinutes : Number(durationMinutes) || 60;
        const result = await (0, availabilityService_1.checkTeacherAvailability)(req.user._id, day, String(startTime), duration);
        res.status(200).json({
            success: true,
            message: result.available ? "You are free at this time" : "Time slot conflicts",
            data: result,
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "";
        if (message === "INVALID_DAY" || message === "INVALID_TIME") {
            res.status(400).json({
                success: false,
                message: "Invalid day or time",
                data: null,
            });
            return;
        }
        res.status(500).json({
            success: false,
            message: "Failed to check availability",
            data: null,
        });
    }
};
exports.checkAvailability = checkAvailability;
