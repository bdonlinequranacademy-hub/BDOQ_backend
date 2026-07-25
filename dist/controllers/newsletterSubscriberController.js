"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.patchAdminNewsletterSubscriberStatus = exports.listAdminNewsletterSubscribers = exports.submitNewsletterSubscriber = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const newsletterSubscriberService_1 = require("../services/newsletterSubscriberService");
function parseStatus(value) {
    if (value === "active" || value === "unsubscribed")
        return value;
    return undefined;
}
function parseLocale(value) {
    if (value === "en" || value === "bn")
        return value;
    return undefined;
}
const submitNewsletterSubscriber = async (req, res) => {
    try {
        const result = await (0, newsletterSubscriberService_1.createNewsletterSubscriber)({
            email: req.body.email,
            locale: parseLocale(req.body.locale),
            source: typeof req.body.source === "string" ? req.body.source : undefined,
        });
        if ("error" in result) {
            res.status(400).json({ success: false, message: result.error, data: null });
            return;
        }
        const { subscriber, created } = result;
        res.status(created ? 201 : 200).json({
            success: true,
            message: created
                ? "Subscribed successfully. JazakAllahu khairan."
                : "You are already on our newsletter list.",
            data: {
                id: subscriber._id,
                status: subscriber.status,
                created,
            },
        });
    }
    catch (err) {
        console.error("[newsletter] submit failed:", err);
        res.status(500).json({
            success: false,
            message: "Failed to subscribe",
            data: null,
        });
    }
};
exports.submitNewsletterSubscriber = submitNewsletterSubscriber;
const listAdminNewsletterSubscribers = async (req, res) => {
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
        const data = await (0, newsletterSubscriberService_1.listNewsletterSubscribers)(status);
        res.status(200).json({
            success: true,
            message: "Newsletter subscribers fetched",
            data,
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch newsletter subscribers",
            data: null,
        });
    }
};
exports.listAdminNewsletterSubscribers = listAdminNewsletterSubscribers;
const patchAdminNewsletterSubscriberStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const status = parseStatus(req.body.status);
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid subscriber ID",
                data: null,
            });
            return;
        }
        if (!status) {
            res.status(400).json({
                success: false,
                message: "status must be active or unsubscribed",
                data: null,
            });
            return;
        }
        const result = await (0, newsletterSubscriberService_1.updateNewsletterSubscriberStatus)(id, status);
        if ("error" in result) {
            res.status(404).json({ success: false, message: result.error, data: null });
            return;
        }
        res.status(200).json({
            success: true,
            message: "Subscriber updated",
            data: result.subscriber,
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to update subscriber",
            data: null,
        });
    }
};
exports.patchAdminNewsletterSubscriberStatus = patchAdminNewsletterSubscriberStatus;
