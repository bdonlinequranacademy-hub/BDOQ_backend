"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatContactMessage = formatContactMessage;
exports.createContactMessage = createContactMessage;
exports.listContactMessages = listContactMessages;
exports.updateContactMessageStatus = updateContactMessageStatus;
const ContactMessage_1 = require("../models/ContactMessage");
const emailService_1 = require("./emailService");
const notificationService_1 = require("./notificationService");
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function notifyEmail() {
    const to = process.env.CONTACT_NOTIFY_EMAIL?.trim() ||
        process.env.TRIAL_NOTIFY_EMAIL?.trim() ||
        process.env.FROM_EMAIL?.trim() ||
        process.env.TEST_EMAIL_TO?.trim();
    return to || null;
}
function formatMessageText(message) {
    const lines = [
        `Name: ${message.name}`,
        `Email: ${message.email}`,
        message.subject ? `Subject: ${message.subject}` : null,
        message.locale ? `Locale: ${message.locale}` : null,
        "",
        message.message,
        "",
        `Submitted: ${message.createdAt.toISOString()}`,
    ].filter((line) => line !== null);
    return lines.join("\n");
}
function formatContactMessage(message) {
    return {
        _id: message._id.toString(),
        name: message.name,
        email: message.email,
        subject: message.subject,
        message: message.message,
        locale: message.locale,
        status: message.status,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
    };
}
async function createContactMessage(input) {
    const name = input.name?.trim();
    const email = input.email?.trim().toLowerCase();
    const body = input.message?.trim();
    if (!name || !email || !body) {
        return { error: "Name, email, and message are required." };
    }
    if (!EMAIL_RE.test(email)) {
        return { error: "Invalid email address." };
    }
    if (body.length < 10) {
        return { error: "Message is too short." };
    }
    const locale = input.locale === "bn" ? "bn" : input.locale === "en" ? "en" : undefined;
    const message = await ContactMessage_1.ContactMessage.create({
        name,
        email,
        subject: input.subject?.trim() || undefined,
        message: body,
        locale,
    });
    const notifyTo = notifyEmail();
    if (notifyTo) {
        const text = formatMessageText(message);
        await (0, emailService_1.sendEmail)({
            to: notifyTo,
            subject: `[Contact] ${name}`,
            text,
            html: text.replace(/\n/g, "<br>"),
        }).catch((err) => {
            console.warn("[contact] Notification email failed:", err);
        });
    }
    else {
        console.log("\n--- New contact message (no CONTACT_NOTIFY_EMAIL) ---");
        console.log(formatMessageText(message));
        console.log("---\n");
    }
    (0, notificationService_1.signalAdminPending)("contact-message");
    return { message };
}
async function listContactMessages(status, limit = 100) {
    const filter = status ? { status } : {};
    const rows = await ContactMessage_1.ContactMessage.find(filter).sort({ createdAt: -1 }).limit(limit);
    return rows.map(formatContactMessage);
}
async function updateContactMessageStatus(id, status) {
    const message = await ContactMessage_1.ContactMessage.findByIdAndUpdate(id, { status }, { new: true, runValidators: true });
    if (!message) {
        return { error: "Contact message not found" };
    }
    return { message: formatContactMessage(message) };
}
