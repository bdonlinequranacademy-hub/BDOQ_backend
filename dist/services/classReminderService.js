"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runClassReminders = runClassReminders;
exports.listRecentClassRemindersForQueue = listRecentClassRemindersForQueue;
const ClassReminderLog_1 = require("../models/ClassReminderLog");
const SessionSlot_1 = require("../models/SessionSlot");
const whatsappMessages_1 = require("../lib/whatsappMessages");
const whatsappPhone_1 = require("../lib/whatsappPhone");
const notificationService_1 = require("./notificationService");
const emailService_1 = require("./emailService");
const verificationTokens_1 = require("./verificationTokens");
const noShowService_1 = require("./noShowService");
const scheduleUtils_1 = require("../utils/scheduleUtils");
const REMINDER_MINUTES = 10;
const REMINDER_WINDOW_MIN = 9;
const REMINDER_WINDOW_MAX = 10.5;
function getAcademyDateString(now = new Date()) {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: scheduleUtils_1.ACADEMY_TIMEZONE,
    }).format(now);
}
function populatedUser(value) {
    if (!value || typeof value !== "object" || !("email" in value))
        return null;
    return value;
}
function populatedClass(value) {
    if (!value || typeof value !== "object" || !("title" in value))
        return null;
    return value;
}
function portalHomeForRole(role) {
    const base = (0, verificationTokens_1.portalBaseUrl)();
    switch (role) {
        case "teacher":
            return `${base}/teacher`;
        case "admin":
        case "super_admin":
            return `${base}/admin`;
        case "student":
        case "parent":
        default:
            return `${base}/student`;
    }
}
function timeLabelForUser(day, startTime, timezone) {
    const formatted = (0, scheduleUtils_1.formatWeeklyTime)(day, startTime, timezone, scheduleUtils_1.ACADEMY_TIMEZONE);
    return `${day} ${formatted} (${timezone.replace("_", " ")})`;
}
async function notifyParticipant(input) {
    const timezone = input.user.timezone?.trim() || scheduleUtils_1.ACADEMY_TIMEZONE;
    const timeLabel = timeLabelForUser(input.day, input.startTime, timezone);
    const portalUrl = portalHomeForRole(input.user.role);
    const waText = (0, whatsappMessages_1.classReminderWhatsAppMessage)({
        recipientName: input.user.name,
        role: input.role,
        classTitle: input.classTitle,
        partnerName: input.partnerName,
        timeLabel,
        meetingLink: input.meetingLink,
        portalUrl,
    });
    let whatsAppUrl = null;
    if (input.user.whatsapp?.trim()) {
        const parsed = (0, whatsappPhone_1.parseWhatsApp)(input.user.whatsapp, input.user.country);
        if (parsed.ok) {
            whatsAppUrl = (0, whatsappPhone_1.buildWaMeUrl)(parsed.value.waMeDigits, waText);
        }
    }
    const portalMessage = (0, whatsappMessages_1.classReminderPortalMessage)({
        classTitle: input.classTitle,
        partnerName: input.partnerName,
        timeLabel,
        meetingLink: input.meetingLink,
        whatsAppUrl,
    });
    await (0, notificationService_1.createUserNotification)({
        userId: input.user._id,
        title: (0, whatsappMessages_1.classReminderPortalTitle)(),
        message: portalMessage,
        type: "class",
    });
    if (input.user.email?.trim()) {
        const subject = (0, whatsappMessages_1.classReminderEmailSubject)(input.classTitle);
        const text = waText;
        const htmlParts = [
            `<p>Assalamu Alaikum <strong>${input.user.name}</strong>,</p>`,
            `<p>Your BDOQ Academy class <strong>${input.classTitle}</strong> with <strong>${input.partnerName}</strong> starts in <strong>10 minutes</strong>.</p>`,
            `<p><strong>Time:</strong> ${timeLabel}</p>`,
        ];
        if (input.meetingLink?.trim()) {
            htmlParts.push(`<p><a href="${input.meetingLink.trim()}">Join class meeting</a></p>`);
        }
        htmlParts.push(`<p><a href="${portalUrl}">Open portal</a></p>`);
        if (whatsAppUrl) {
            htmlParts.push(`<p><a href="${whatsAppUrl}">Open WhatsApp reminder</a> (save or forward to family)</p>`);
        }
        htmlParts.push("<p>JazakAllah Khair — BD Online Quran Academy</p>");
        await (0, emailService_1.sendEmail)({
            to: input.user.email,
            subject,
            text,
            html: htmlParts.join("\n"),
        }).catch((err) => {
            console.warn("[class-reminder] email failed:", err);
        });
    }
}
async function runClassReminders() {
    const today = (0, scheduleUtils_1.getTodayScheduleDay)();
    const sessionDate = getAcademyDateString();
    const now = new Date();
    const slots = await SessionSlot_1.SessionSlot.find({
        day: today,
        isActive: true,
        $or: [
            { sessionPhase: "upcoming" },
            { sessionPhase: { $exists: false } },
        ],
    })
        .populate("class", "title meetingLink isActive teacher")
        .populate("teacher", "name email role isActive timezone country whatsapp meetingLink")
        .populate("student", "name email role isActive timezone country whatsapp");
    let sent = 0;
    for (const slot of slots) {
        const startsAt = (0, scheduleUtils_1.getSessionInstant)(slot.day, slot.startTime);
        if (!startsAt)
            continue;
        const minutesUntil = (startsAt.getTime() - now.getTime()) / 60000;
        if (minutesUntil <= REMINDER_WINDOW_MIN || minutesUntil > REMINDER_WINDOW_MAX) {
            continue;
        }
        const existing = await ClassReminderLog_1.ClassReminderLog.findOne({
            sessionSlot: slot._id,
            sessionDate,
        });
        if (existing)
            continue;
        const classDoc = populatedClass(slot.class);
        if (!classDoc || classDoc.isActive === false)
            continue;
        const teacher = populatedUser(slot.teacher);
        const student = populatedUser(slot.student);
        if (!teacher?.isActive || !student?.isActive)
            continue;
        const meetingLink = classDoc.meetingLink?.trim() ||
            teacher.meetingLink?.trim() ||
            undefined;
        try {
            await notifyParticipant({
                user: teacher,
                role: "teacher",
                classTitle: classDoc.title,
                partnerName: student.name,
                day: slot.day,
                startTime: slot.startTime,
                meetingLink,
            });
            await notifyParticipant({
                user: student,
                role: "student",
                classTitle: classDoc.title,
                partnerName: teacher.name,
                day: slot.day,
                startTime: slot.startTime,
                meetingLink,
            });
            const studentTz = student.timezone?.trim() || scheduleUtils_1.ACADEMY_TIMEZONE;
            const timeLabel = timeLabelForUser(slot.day, slot.startTime, studentTz);
            await (0, noShowService_1.notifyParentsOnClassReminder)(student._id.toString(), classDoc.title, teacher.name, timeLabel);
            await ClassReminderLog_1.ClassReminderLog.create({
                sessionSlot: slot._id,
                sessionDate,
            });
            sent += 1;
        }
        catch (err) {
            console.warn("[class-reminder] failed for slot", slot._id.toString(), err);
        }
    }
    if (sent > 0) {
        console.log(`[class-reminder] sent ${sent} session reminder(s) (${REMINDER_MINUTES} min before)`);
    }
    return sent;
}
/** For admin WhatsApp queue — today's classes with reminders sent or due soon. */
async function listRecentClassRemindersForQueue() {
    const today = (0, scheduleUtils_1.getTodayScheduleDay)();
    const sessionDate = getAcademyDateString();
    const now = new Date();
    const slots = await SessionSlot_1.SessionSlot.find({ day: today, isActive: true })
        .populate("class", "title meetingLink isActive")
        .populate("teacher", "name email whatsapp country isActive")
        .populate("student", "name email whatsapp country isActive");
    const remindedIds = new Set((await ClassReminderLog_1.ClassReminderLog.find({ sessionDate }).select("sessionSlot")).map((log) => log.sessionSlot.toString()));
    const results = [];
    for (const slot of slots) {
        const startsAt = (0, scheduleUtils_1.getSessionInstant)(slot.day, slot.startTime);
        if (!startsAt)
            continue;
        const minutesUntil = (startsAt.getTime() - now.getTime()) / 60000;
        const reminded = remindedIds.has(slot._id.toString());
        if (minutesUntil < -5 || (minutesUntil > 15 && !reminded))
            continue;
        const classDoc = populatedClass(slot.class);
        const teacher = populatedUser(slot.teacher);
        const student = populatedUser(slot.student);
        if (!classDoc || !teacher || !student)
            continue;
        results.push({
            slot,
            classTitle: classDoc.title,
            teacher,
            student,
            meetingLink: classDoc.meetingLink?.trim() || teacher.meetingLink?.trim(),
            minutesUntil,
            reminded,
        });
    }
    return results.sort((a, b) => a.minutesUntil - b.minutesUntil);
}
