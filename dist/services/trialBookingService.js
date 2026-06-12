"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatTrialBooking = formatTrialBooking;
exports.createTrialBooking = createTrialBooking;
exports.listTrialBookings = listTrialBookings;
exports.updateTrialBookingStatus = updateTrialBookingStatus;
exports.countTrialBookingsByStatus = countTrialBookingsByStatus;
const TrialBooking_1 = require("../models/TrialBooking");
const emailService_1 = require("./emailService");
const notificationService_1 = require("./notificationService");
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function notifyEmail() {
    const to = process.env.TRIAL_NOTIFY_EMAIL?.trim() ||
        process.env.FROM_EMAIL?.trim() ||
        process.env.TEST_EMAIL_TO?.trim();
    return to || null;
}
function formatBookingText(booking) {
    const lines = [
        `Name: ${booking.parentName}`,
        `Email: ${booking.email}`,
        `WhatsApp: ${booking.whatsapp}`,
        `Learner: ${booking.learnerType}`,
        `Teacher preference: ${booking.teacherPreference}`,
        booking.timeSlot ? `Preferred time: ${booking.timeSlot}` : null,
        booking.preferredDays.length
            ? `Preferred days: ${booking.preferredDays.join(", ")}`
            : null,
        booking.timezone ? `Timezone: ${booking.timezone}` : null,
        booking.source ? `How they heard: ${booking.source}` : null,
        booking.courseSlug ? `Course: ${booking.courseSlug}` : null,
        booking.teacherSlug ? `Teacher: ${booking.teacherSlug}` : null,
        booking.utmSource ? `UTM: ${booking.utmSource} / ${booking.utmMedium ?? ""}` : null,
        `Submitted: ${booking.createdAt.toISOString()}`,
    ].filter(Boolean);
    return lines.join("\n");
}
function formatTrialBooking(booking) {
    return {
        _id: booking._id.toString(),
        parentName: booking.parentName,
        email: booking.email,
        whatsapp: booking.whatsapp,
        learnerType: booking.learnerType,
        timeSlot: booking.timeSlot,
        teacherPreference: booking.teacherPreference,
        preferredDays: booking.preferredDays ?? [],
        timezone: booking.timezone,
        source: booking.source,
        courseSlug: booking.courseSlug,
        teacherSlug: booking.teacherSlug,
        utmSource: booking.utmSource,
        utmMedium: booking.utmMedium,
        utmCampaign: booking.utmCampaign,
        utmContent: booking.utmContent,
        status: booking.status,
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt,
    };
}
async function createTrialBooking(input) {
    const parentName = input.parentName?.trim();
    const email = input.email?.trim().toLowerCase();
    const whatsapp = input.whatsapp?.trim();
    if (!parentName || !email || !whatsapp) {
        return { error: "Name, email, and WhatsApp are required." };
    }
    if (!EMAIL_RE.test(email)) {
        return { error: "Invalid email address." };
    }
    if (!["child", "teen", "adult"].includes(input.learnerType)) {
        return { error: "Invalid learner type." };
    }
    const booking = await TrialBooking_1.TrialBooking.create({
        parentName,
        email,
        whatsapp,
        learnerType: input.learnerType,
        timeSlot: input.timeSlot,
        teacherPreference: input.teacherPreference ?? "any",
        preferredDays: input.preferredDays ?? [],
        timezone: input.timezone?.trim(),
        source: input.source?.trim(),
        courseSlug: input.courseSlug?.trim(),
        teacherSlug: input.teacherSlug?.trim(),
        utmSource: input.utmSource?.trim(),
        utmMedium: input.utmMedium?.trim(),
        utmCampaign: input.utmCampaign?.trim(),
        utmContent: input.utmContent?.trim(),
    });
    const notifyTo = notifyEmail();
    if (notifyTo) {
        const text = formatBookingText(booking);
        await (0, emailService_1.sendEmail)({
            to: notifyTo,
            subject: `[Trial] ${parentName} — ${booking.learnerType}`,
            text,
            html: text.replace(/\n/g, "<br>"),
        }).catch((err) => {
            console.warn("[trial] Notification email failed:", err);
        });
    }
    else {
        console.log("\n--- New trial booking (no TRIAL_NOTIFY_EMAIL) ---");
        console.log(formatBookingText(booking));
        console.log("---\n");
    }
    (0, notificationService_1.signalAdminPending)("trial-booking");
    return { booking };
}
async function listTrialBookings(status, limit = 100) {
    const filter = status ? { status } : {};
    const rows = await TrialBooking_1.TrialBooking.find(filter).sort({ createdAt: -1 }).limit(limit);
    return rows.map(formatTrialBooking);
}
async function updateTrialBookingStatus(id, status) {
    const booking = await TrialBooking_1.TrialBooking.findByIdAndUpdate(id, { status }, { new: true, runValidators: true });
    if (!booking) {
        return { error: "Trial booking not found" };
    }
    return { booking: formatTrialBooking(booking) };
}
async function countTrialBookingsByStatus(status) {
    return TrialBooking_1.TrialBooking.countDocuments({ status });
}
