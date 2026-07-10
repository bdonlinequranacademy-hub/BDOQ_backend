"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changeAdminPassword = exports.updateAdminProfile = exports.getAdminProfile = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const User_1 = require("../models/User");
const avatarFields_1 = require("../lib/avatarFields");
function toProfileView(user) {
    return {
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        ...(0, avatarFields_1.avatarFieldsFromUser)(user),
        gender: user.gender,
    };
}
const getAdminProfile = async (req, res) => {
    try {
        const user = await User_1.User.findById(req.user._id).select("name email role avatarUrl gender");
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
exports.getAdminProfile = getAdminProfile;
const updateAdminProfile = async (req, res) => {
    try {
        const { name } = req.body;
        const update = {};
        if (typeof name === "string" && name.trim()) {
            update.name = name.trim();
        }
        if (Object.keys(update).length === 0) {
            res.status(400).json({
                success: false,
                message: "Nothing to update",
                data: null,
            });
            return;
        }
        const user = await User_1.User.findByIdAndUpdate(req.user._id, update, {
            new: true,
            runValidators: true,
        }).select("name email role avatarUrl gender");
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
exports.updateAdminProfile = updateAdminProfile;
const changeAdminPassword = async (req, res) => {
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
exports.changeAdminPassword = changeAdminPassword;
