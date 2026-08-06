"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatTrialBooking = formatTrialBooking;
exports.createTrialBooking = createTrialBooking;
exports.listTrialBookings = listTrialBookings;
exports.updateTrialBookingStatus = updateTrialBookingStatus;
exports.updateTrialBooking = updateTrialBooking;
exports.sendTrialInvitation = sendTrialInvitation;
exports.deleteTrialBooking = deleteTrialBooking;
exports.countTrialBookingsByStatus = countTrialBookingsByStatus;
const TrialBooking_1 = require("../models/TrialBooking");
const TeacherProfile_1 = require("../models/TeacherProfile");
const emailService_1 = require("./emailService");
const notificationService_1 = require("./notificationService");
const whatsappPhone_1 = require("../lib/whatsappPhone");
const countryTimezone_1 = require("../lib/countryTimezone");
const trialInvitationContent_1 = require("../lib/trialInvitationContent");
const trialMeetingPlatform_1 = require("../lib/trialMeetingPlatform");
const brandEmailTemplate_1 = require("../lib/email/brandEmailTemplate");
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
    const localSchedule = (0, countryTimezone_1.formatTrialLocalSchedule)(booking.preferredTrialDate, booking.preferredTrialTime, booking.timezone);
    const bdSchedule = (0, countryTimezone_1.formatTrialBangladeshSchedule)(booking.preferredTrialDate, booking.preferredTrialTime, booking.timezone);
    const lines = [
        `Parent: ${booking.parentName}`,
        booking.studentName ? `Student: ${booking.studentName}` : null,
        booking.email ? `Email: ${booking.email}` : null,
        `WhatsApp: ${booking.whatsapp}`,
        booking.country ? `Country: ${booking.country}` : null,
        booking.age ? `Age: ${booking.age}` : null,
        booking.learnerGender ? `Gender: ${booking.learnerGender}` : null,
        `Learner type: ${booking.learnerType}`,
        `Teacher preference: ${booking.teacherPreference}`,
        localSchedule ? `Trial (parent local): ${localSchedule}` : null,
        bdSchedule ? `Trial (Bangladesh): ${bdSchedule}` : null,
        booking.timeSlot ? `Preferred time (legacy): ${booking.timeSlot}` : null,
        booking.preferredDays.length
            ? `Preferred days (legacy): ${booking.preferredDays.join(", ")}`
            : null,
        booking.timezone ? `Timezone: ${booking.timezone}` : null,
        booking.additionalNote ? `Note: ${booking.additionalNote}` : null,
        booking.source ? `How they heard: ${booking.source}` : null,
        booking.courseSlug ? `Course: ${booking.courseSlug}` : null,
        booking.teacherSlug ? `Assigned teacher: ${booking.teacherSlug}` : null,
        booking.meetingPlatform
            ? `Platform: ${(0, trialMeetingPlatform_1.formatTrialMeetingPlatform)(booking.meetingPlatform)}`
            : null,
        booking.meetingLink ? `Meeting link: ${booking.meetingLink}` : null,
        booking.invitationSentAt
            ? `Invitation sent: ${booking.invitationSentAt.toISOString()}`
            : null,
        booking.utmSource ? `UTM: ${booking.utmSource} / ${booking.utmMedium ?? ""}` : null,
        `Submitted: ${booking.createdAt.toISOString()}`,
    ].filter(Boolean);
    return lines.join("\n");
}
function formatTrialBooking(booking) {
    return {
        _id: booking._id.toString(),
        parentName: booking.parentName,
        studentName: booking.studentName,
        email: booking.email,
        whatsapp: booking.whatsapp,
        country: booking.country,
        age: booking.age,
        learnerGender: booking.learnerGender,
        learnerType: booking.learnerType,
        preferredTrialDate: booking.preferredTrialDate,
        preferredTrialTime: booking.preferredTrialTime,
        additionalNote: booking.additionalNote,
        timeSlot: booking.timeSlot,
        teacherPreference: booking.teacherPreference,
        preferredDays: booking.preferredDays ?? [],
        timezone: booking.timezone,
        source: booking.source,
        courseSlug: booking.courseSlug,
        teacherSlug: booking.teacherSlug,
        meetingPlatform: booking.meetingPlatform,
        meetingLink: booking.meetingLink,
        invitationSentAt: booking.invitationSentAt,
        convertedAdmissionId: booking.convertedAdmissionId?.toString(),
        convertedUserId: booking.convertedUserId?.toString(),
        convertedAt: booking.convertedAt,
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
    const studentName = input.studentName?.trim();
    const email = input.email?.trim().toLowerCase();
    const whatsappRaw = input.whatsapp?.trim();
    const country = input.country?.trim();
    const preferredTrialDate = input.preferredTrialDate?.trim();
    const preferredTrialTime = input.preferredTrialTime?.trim();
    const additionalNote = input.additionalNote?.trim();
    const timezone = input.timezone?.trim() || (0, countryTimezone_1.resolveTimezoneFromCountry)(country ?? "");
    if (!parentName || !whatsappRaw) {
        return { error: "Parent name and WhatsApp are required." };
    }
    if (!studentName) {
        return { error: "Student name is required." };
    }
    if (email && !EMAIL_RE.test(email)) {
        return { error: "Invalid email address." };
    }
    if (!country) {
        return { error: "Country is required." };
    }
    if (!preferredTrialDate || !preferredTrialTime) {
        return { error: "Preferred trial date and time are required." };
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
        studentName,
        email: email || undefined,
        whatsapp: normalizedWa.whatsapp,
        country,
        age: input.age?.trim() || undefined,
        learnerGender: input.learnerGender,
        learnerType: input.learnerType,
        preferredTrialDate,
        preferredTrialTime,
        additionalNote: additionalNote || undefined,
        timeSlot: input.timeSlot,
        teacherPreference: input.teacherPreference ?? "any",
        preferredDays: input.preferredDays ?? [],
        timezone,
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
            return { error: "Parent name is required." };
        booking.parentName = parentName;
    }
    if (input.studentName !== undefined) {
        const studentName = input.studentName.trim();
        if (!studentName)
            return { error: "Student name is required." };
        booking.studentName = studentName;
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
        if (input.timezone === undefined) {
            booking.timezone = (0, countryTimezone_1.resolveTimezoneFromCountry)(country);
        }
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
    if (input.preferredTrialDate !== undefined) {
        booking.preferredTrialDate = input.preferredTrialDate.trim() || undefined;
    }
    if (input.preferredTrialTime !== undefined) {
        booking.preferredTrialTime = input.preferredTrialTime.trim() || undefined;
    }
    if (input.additionalNote !== undefined) {
        booking.additionalNote = input.additionalNote.trim() || undefined;
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
    if (input.teacherSlug !== undefined) {
        booking.teacherSlug = input.teacherSlug.trim() || undefined;
    }
    if (input.meetingPlatform !== undefined) {
        booking.meetingPlatform = input.meetingPlatform;
    }
    if (input.meetingLink !== undefined) {
        booking.meetingLink = (0, trialMeetingPlatform_1.normalizeMeetingLink)(input.meetingLink) || undefined;
    }
    if (input.status !== undefined) {
        booking.status = input.status;
    }
    await booking.save();
    return { booking: formatTrialBooking(booking) };
}
function formatCourseLabel(slug) {
    if (!slug?.trim())
        return "General trial class";
    return slug
        .trim()
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}
async function sendTrialInvitation(id, input) {
    const booking = await TrialBooking_1.TrialBooking.findById(id);
    if (!booking) {
        return { error: "Trial booking not found" };
    }
    if (input?.teacherSlug !== undefined) {
        booking.teacherSlug = input.teacherSlug.trim() || undefined;
    }
    if (input?.meetingPlatform !== undefined) {
        booking.meetingPlatform = input.meetingPlatform;
    }
    if (input?.meetingLink !== undefined) {
        booking.meetingLink = (0, trialMeetingPlatform_1.normalizeMeetingLink)(input.meetingLink) || undefined;
    }
    if (!booking.teacherSlug?.trim()) {
        return { error: "Assign a teacher before sending the invitation." };
    }
    if (!booking.meetingPlatform) {
        return { error: "Select a meeting platform before sending the invitation." };
    }
    if (!booking.meetingLink?.trim()) {
        return { error: "Add a meeting link before sending the invitation." };
    }
    if (!booking.preferredTrialDate?.trim() || !booking.preferredTrialTime?.trim()) {
        return { error: "Trial date and time are required before sending the invitation." };
    }
    const teacher = await TeacherProfile_1.TeacherProfile.findOne({ slug: booking.teacherSlug.trim() });
    const teacherName = teacher?.name?.trim() || booking.teacherSlug.trim();
    const courseLabel = formatCourseLabel(booking.courseSlug);
    const invitation = (0, trialInvitationContent_1.buildTrialInvitationContent)({
        booking,
        teacherName,
        courseLabel,
    });
    let emailSent = false;
    let emailError;
    const recipientEmail = booking.email?.trim();
    if (recipientEmail && EMAIL_RE.test(recipientEmail)) {
        const html = (0, brandEmailTemplate_1.buildBrandEmailHtml)({
            title: invitation.emailTitle,
            greeting: invitation.greeting,
            messageBody: invitation.messageBody,
            buttonText: invitation.meetingLink ? "Join Trial Class" : undefined,
            buttonLink: invitation.meetingLink,
            preheader: invitation.emailTitle,
        });
        const text = (0, brandEmailTemplate_1.buildBrandEmailText)({
            title: invitation.emailTitle,
            greeting: invitation.greeting,
            messageBody: invitation.messageBody,
            buttonText: invitation.meetingLink ? "Join Trial Class" : undefined,
            buttonLink: invitation.meetingLink,
        });
        const emailResult = await (0, emailService_1.sendEmail)({
            to: recipientEmail,
            subject: invitation.subject,
            text,
            html,
        });
        emailSent = emailResult.sent;
        if (!emailResult.sent) {
            emailError = emailResult.error ?? "Email could not be sent.";
        }
    }
    const waParsed = (0, whatsappPhone_1.parseWhatsApp)(booking.whatsapp, booking.country);
    const whatsappUrl = waParsed.ok && waParsed.value.waMeDigits
        ? (0, whatsappPhone_1.buildWaMeUrl)(waParsed.value.waMeDigits, invitation.whatsappMessage)
        : null;
    booking.invitationSentAt = new Date();
    if (booking.status !== "closed") {
        booking.status = "scheduled";
    }
    await booking.save();
    return {
        booking: formatTrialBooking(booking),
        delivery: {
            emailSent,
            emailError,
            whatsappUrl,
        },
    };
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
