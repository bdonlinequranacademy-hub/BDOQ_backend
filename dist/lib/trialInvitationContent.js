"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildTrialInvitationContent = buildTrialInvitationContent;
const countryTimezone_1 = require("./countryTimezone");
const trialMeetingPlatform_1 = require("./trialMeetingPlatform");
const trialMeetingPlatform_2 = require("./trialMeetingPlatform");
const ACADEMY = "BD Online Quran Academy";
const WHATSAPP_SUPPORT = "+8801923-947460";
function firstName(name) {
    return name.split(" ")[0] || name;
}
function buildTrialInvitationContent(input) {
    const { booking, teacherName, courseLabel } = input;
    const studentName = booking.studentName?.trim() || booking.parentName;
    const parentName = booking.parentName;
    const platformLabel = (0, trialMeetingPlatform_1.formatTrialMeetingPlatform)(booking.meetingPlatform);
    const localSchedule = (0, countryTimezone_1.formatTrialLocalSchedule)(booking.preferredTrialDate, booking.preferredTrialTime, booking.timezone) ?? "To be confirmed";
    const bdSchedule = (0, countryTimezone_1.formatTrialBangladeshSchedule)(booking.preferredTrialDate, booking.preferredTrialTime, booking.timezone) ?? "To be confirmed";
    const meetingLink = (0, trialMeetingPlatform_2.normalizeMeetingLink)(booking.meetingLink);
    const lines = [
        `Student: ${studentName}`,
        `Course: ${courseLabel}`,
        `Teacher: ${teacherName}`,
        `Your local time: ${localSchedule}`,
        `Bangladesh time: ${bdSchedule}`,
        `Platform: ${platformLabel}`,
        meetingLink ? `Join link: ${meetingLink}` : null,
        "",
        "Please join on time. If you need to reschedule, reply on WhatsApp.",
        "",
        `Support WhatsApp: ${WHATSAPP_SUPPORT}`,
        "",
        `JazakAllah Khair,\n${ACADEMY}`,
    ].filter((line) => line !== null);
    const messageBody = lines.join("\n");
    const whatsappLines = [
        `Assalamu Alaikum ${firstName(parentName)},`,
        "",
        `Your *free trial class* at ${ACADEMY} is confirmed.`,
        "",
        `*Student:* ${studentName}`,
        `*Course:* ${courseLabel}`,
        `*Teacher:* ${teacherName}`,
        `*Your time:* ${localSchedule}`,
        `*BD time:* ${bdSchedule}`,
        `*Platform:* ${platformLabel}`,
        meetingLink ? `*Join:* ${meetingLink}` : null,
        "",
        "Please join on time. Reply here if you need to reschedule.",
        "",
        "JazakAllah Khair.",
    ].filter((line) => line !== null);
    return {
        subject: `Free Trial Class Confirmed — ${studentName} | ${ACADEMY}`,
        emailTitle: "Your Free Trial Class is Confirmed",
        greeting: `Assalamu Alaikum ${parentName},`,
        messageBody,
        whatsappMessage: whatsappLines.join("\n"),
        meetingLink,
    };
}
