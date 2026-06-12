"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.patchAdminContactMessageStatus = exports.listAdminContactMessages = exports.submitContactMessage = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const contactMessageService_1 = require("../services/contactMessageService");
function parseContactStatus(value) {
    if (value === "new" || value === "replied" || value === "closed")
        return value;
    return undefined;
}
function parseLocale(value) {
    if (value === "en" || value === "bn")
        return value;
    return undefined;
}
const submitContactMessage = async (req, res) => {
    try {
        const result = await (0, contactMessageService_1.createContactMessage)({
            name: req.body.name,
            email: req.body.email,
            message: req.body.message,
            locale: parseLocale(req.body.locale),
        });
        if ("error" in result) {
            res.status(400).json({ success: false, message: result.error, data: null });
            return;
        }
        const { message } = result;
        res.status(201).json({
            success: true,
            message: "Message received. We'll reply within 24 hours.",
            data: { id: message._id, status: message.status },
        });
    }
    catch (err) {
        console.error("[contact] submit failed:", err);
        res.status(500).json({
            success: false,
            message: "Failed to send message",
            data: null,
        });
    }
};
exports.submitContactMessage = submitContactMessage;
const listAdminContactMessages = async (req, res) => {
    try {
        const status = parseContactStatus(req.query.status);
        if (req.query.status && !status) {
            res.status(400).json({
                success: false,
                message: "Invalid status filter",
                data: null,
            });
            return;
        }
        const data = await (0, contactMessageService_1.listContactMessages)(status);
        res.status(200).json({
            success: true,
            message: "Contact messages fetched",
            data,
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch contact messages",
            data: null,
        });
    }
};
exports.listAdminContactMessages = listAdminContactMessages;
const patchAdminContactMessageStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const status = parseContactStatus(req.body.status);
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid message ID",
                data: null,
            });
            return;
        }
        if (!status) {
            res.status(400).json({
                success: false,
                message: "status must be new, replied, or closed",
                data: null,
            });
            return;
        }
        const result = await (0, contactMessageService_1.updateContactMessageStatus)(id, status);
        if ("error" in result) {
            res.status(404).json({ success: false, message: result.error, data: null });
            return;
        }
        res.status(200).json({
            success: true,
            message: "Contact message updated",
            data: result.message,
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to update contact message",
            data: null,
        });
    }
};
exports.patchAdminContactMessageStatus = patchAdminContactMessageStatus;
