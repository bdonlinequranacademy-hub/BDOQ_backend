"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatNewsletterSubscriber = formatNewsletterSubscriber;
exports.createNewsletterSubscriber = createNewsletterSubscriber;
exports.listNewsletterSubscribers = listNewsletterSubscribers;
exports.updateNewsletterSubscriberStatus = updateNewsletterSubscriberStatus;
const NewsletterSubscriber_1 = require("../models/NewsletterSubscriber");
const emailService_1 = require("./emailService");
const notificationService_1 = require("./notificationService");
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function notifyEmail() {
    const to = process.env.NEWSLETTER_NOTIFY_EMAIL?.trim() ||
        process.env.CONTACT_NOTIFY_EMAIL?.trim() ||
        process.env.TRIAL_NOTIFY_EMAIL?.trim() ||
        process.env.FROM_EMAIL?.trim() ||
        process.env.TEST_EMAIL_TO?.trim();
    return to || null;
}
function formatNewsletterSubscriber(row) {
    return {
        _id: row._id.toString(),
        email: row.email,
        locale: row.locale,
        source: row.source,
        status: row.status,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}
async function createNewsletterSubscriber(input) {
    const email = input.email?.trim().toLowerCase();
    if (!email) {
        return { error: "Email is required." };
    }
    if (!EMAIL_RE.test(email)) {
        return { error: "Invalid email address." };
    }
    const locale = input.locale === "bn" ? "bn" : input.locale === "en" ? "en" : undefined;
    const source = input.source?.trim().slice(0, 80) || "footer";
    const existing = await NewsletterSubscriber_1.NewsletterSubscriber.findOne({ email });
    if (existing) {
        if (existing.status === "unsubscribed") {
            existing.status = "active";
            if (locale)
                existing.locale = locale;
            existing.source = source;
            await existing.save();
            (0, notificationService_1.signalAdminPending)("newsletter-subscribe");
            return { subscriber: existing, created: false };
        }
        return { subscriber: existing, created: false };
    }
    const subscriber = await NewsletterSubscriber_1.NewsletterSubscriber.create({
        email,
        locale,
        source,
        status: "active",
    });
    const notifyTo = notifyEmail();
    if (notifyTo) {
        const text = [
            `New newsletter subscriber: ${email}`,
            locale ? `Locale: ${locale}` : null,
            `Source: ${source}`,
            `Submitted: ${subscriber.createdAt.toISOString()}`,
        ]
            .filter(Boolean)
            .join("\n");
        await (0, emailService_1.sendEmail)({
            to: notifyTo,
            subject: `[Newsletter] ${email}`,
            text,
            html: text.replace(/\n/g, "<br>"),
        }).catch((err) => {
            console.warn("[newsletter] Notification email failed:", err);
        });
    }
    else {
        console.log("\n--- New newsletter subscriber (no notify email) ---");
        console.log(email, source, locale ?? "-");
        console.log("---\n");
    }
    (0, notificationService_1.signalAdminPending)("newsletter-subscribe");
    return { subscriber, created: true };
}
async function listNewsletterSubscribers(status, limit = 200) {
    const filter = status ? { status } : {};
    const rows = await NewsletterSubscriber_1.NewsletterSubscriber.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit);
    return rows.map(formatNewsletterSubscriber);
}
async function updateNewsletterSubscriberStatus(id, status) {
    const subscriber = await NewsletterSubscriber_1.NewsletterSubscriber.findByIdAndUpdate(id, { status }, { new: true, runValidators: true });
    if (!subscriber) {
        return { error: "Subscriber not found" };
    }
    return { subscriber: formatNewsletterSubscriber(subscriber) };
}
