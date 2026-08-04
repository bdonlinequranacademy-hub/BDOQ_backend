"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatTrialBooking = formatTrialBooking;
exports.createTrialBooking = createTrialBooking;
exports.listTrialBookings = listTrialBookings;
exports.updateTrialBookingStatus = updateTrialBookingStatus;
exports.updateTrialBooking = updateTrialBooking;
exports.deleteTrialBooking = deleteTrialBooking;
exports.countTrialBookingsByStatus = countTrialBookingsByStatus;
const TrialBooking_1 = require("../models/TrialBooking");
const emailService_1 = require("./emailService");
const notificationService_1 = require("./notificationService");
const whatsappPhone_1 = require("../lib/whatsappPhone");
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function notifyEmail() {
    const to = process.env.TRIAL_NOTIFY_EMAIL?.trim() ||
        process.env.FROM_EMAIL?.trim() ||
        process.env.TEST_EMAIL_TO?.trim();
    return to || null;
}
function deriveLearnerTypeFromAge(age) {
    if (age === "70+")
        return "adult";
    const years = Number.parseInt(age, 10);
    if (Number.isNaN(years))
        return "adult";
    if (years < 12)
        return "child";
    if (years < 18)
        return "teen";
    return "adult";
}
function formatBookingText(booking) {
    const lines = [
        `Name: ${booking.parentName}`,
        booking.email ? `Email: ${booking.email}` : null,
        `WhatsApp: ${booking.whatsapp}`,
        booking.country ? `Country: ${booking.country}` : null,
        booking.age ? `Age: ${booking.age}` : null,
        booking.learnerGender ? `Gender: ${booking.learnerGender}` : null,
        `Learner type: ${booking.learnerType}`,
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
        country: booking.country,
        age: booking.age,
        learnerGender: booking.learnerGender,
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
    const whatsappRaw = input.whatsapp?.trim();
    const country = input.country?.trim();
    if (!parentName || !whatsappRaw) {
        return { error: "Name and WhatsApp are required." };
    }
    if (email && !EMAIL_RE.test(email)) {
        return { error: "Invalid email address." };
    }
    if (!country) {
        return { error: "Country is required." };
    }
    const normalizedWa = (0, whatsappPhone_1.normalizeWhatsAppForStorage)(whatsappRaw, country);
    if (!normalizedWa.ok) {
        return { error: normalizedWa.error };
    }
    if (!["child", "teen", "adult"].includes(input.learnerType)) {
        return { error: "Invalid learner type." };
    }
    const booking = await TrialBooking_1.TrialBooking.create({
        parentName,
        email: email || undefined,
        whatsapp: normalizedWa.whatsapp,
        country,
        age: input.age?.trim() || undefined,
        learnerGender: input.learnerGender,
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
async function updateTrialBooking(id, input) {
    const booking = await TrialBooking_1.TrialBooking.findById(id);
    if (!booking) {
        return { error: "Trial booking not found" };
    }
    if (input.parentName !== undefined) {
        const parentName = input.parentName.trim();
        if (!parentName)
            return { error: "Name is required." };
        booking.parentName = parentName;
    }
    if (input.email !== undefined) {
        const email = input.email.trim().toLowerCase();
        if (email && !EMAIL_RE.test(email)) {
            return { error: "Invalid email address." };
        }
        booking.email = email || undefined;
    }
    if (input.country !== undefined) {
        const country = input.country.trim();
        if (!country)
            return { error: "Country is required." };
        booking.country = country;
    }
    if (input.whatsapp !== undefined) {
        const whatsappRaw = input.whatsapp.trim();
        if (!whatsappRaw)
            return { error: "WhatsApp is required." };
        const country = booking.country?.trim() || input.country?.trim() || "Bangladesh";
        const normalizedWa = (0, whatsappPhone_1.normalizeWhatsAppForStorage)(whatsappRaw, country);
        if (!normalizedWa.ok)
            return { error: normalizedWa.error };
        booking.whatsapp = normalizedWa.whatsapp;
    }
    if (input.age !== undefined) {
        const age = input.age.trim();
        booking.age = age || undefined;
        if (age) {
            booking.learnerType = deriveLearnerTypeFromAge(age);
        }
    }
    if (input.learnerGender !== undefined) {
        booking.learnerGender = input.learnerGender;
    }
    if (input.learnerType !== undefined) {
        booking.learnerType = input.learnerType;
    }
    if (input.timeSlot !== undefined) {
        booking.timeSlot = input.timeSlot;
    }
    if (input.teacherPreference !== undefined) {
        booking.teacherPreference = input.teacherPreference;
    }
    if (input.preferredDays !== undefined) {
        booking.preferredDays = input.preferredDays
            .map((day) => day.trim())
            .filter(Boolean);
    }
    if (input.timezone !== undefined) {
        booking.timezone = input.timezone.trim() || undefined;
    }
    if (input.courseSlug !== undefined) {
        booking.courseSlug = input.courseSlug.trim() || undefined;
    }
    if (input.status !== undefined) {
        booking.status = input.status;
    }
    await booking.save();
    return { booking: formatTrialBooking(booking) };
}
async function deleteTrialBooking(id) {
    const deleted = await TrialBooking_1.TrialBooking.findByIdAndDelete(id);
    if (!deleted) {
        return { error: "Trial booking not found" };
    }
    return { ok: true };
}
async function countTrialBookingsByStatus(status) {
    return TrialBooking_1.TrialBooking.countDocuments({ status });
}
