"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentOverdueMessage = paymentOverdueMessage;
exports.paymentDueSoonMessage = paymentDueSoonMessage;
exports.welcomeStudentMessage = welcomeStudentMessage;
exports.welcomeTeacherMessage = welcomeTeacherMessage;
exports.trialLeadFollowUpMessage = trialLeadFollowUpMessage;
exports.admissionFollowUpMessage = admissionFollowUpMessage;
exports.teacherApplicationFollowUpMessage = teacherApplicationFollowUpMessage;
exports.classReminderWhatsAppMessage = classReminderWhatsAppMessage;
exports.classReminderEmailSubject = classReminderEmailSubject;
exports.classReminderPortalTitle = classReminderPortalTitle;
exports.classReminderPortalMessage = classReminderPortalMessage;
const ACADEMY = "BD Online Quran Academy";
function paymentOverdueMessage(studentName, paidUntilText) {
    const first = studentName.split(" ")[0] || studentName;
    return `Assalamu Alaikum ${first},

This is a friendly reminder from ${ACADEMY}.

Your academy payment is *overdue* (paid until ${paidUntilText}).

Please submit your payment proof in the student portal, or reply here if you need help.

JazakAllah Khair.`;
}
function paymentDueSoonMessage(studentName, paidUntilText) {
    const first = studentName.split(" ")[0] || studentName;
    return `Assalamu Alaikum ${first},

This is a reminder from ${ACADEMY}.

Your monthly payment is *due soon* (paid until ${paidUntilText}).

Please submit payment proof in the portal when ready.

JazakAllah Khair.`;
}
function welcomeStudentMessage(name, loginUrl) {
    const first = name.split(" ")[0] || name;
    return `Assalamu Alaikum ${first},

Welcome to ${ACADEMY}! Your student portal account is ready.

Sign in: ${loginUrl}

We look forward to your Quran learning journey.`;
}
function welcomeTeacherMessage(name, loginUrl) {
    const first = name.split(" ")[0] || name;
    return `Assalamu Alaikum ${first},

Your ${ACADEMY} teacher portal account is ready.

Sign in: ${loginUrl}

Please update your profile and availability in the portal.`;
}
function trialLeadFollowUpMessage(studentName) {
    const first = studentName.split(" ")[0] || studentName;
    return `Assalamu Alaikum Dear ${first},

Thank you for booking a *free trial class* with ${ACADEMY}.

We would love to schedule your class. What time works best for you this week?

JazakAllah Khair.`;
}
function admissionFollowUpMessage(name) {
    const first = name.split(" ")[0] || name;
    return `Assalamu Alaikum ${first},

Thank you for your *student admission* application at ${ACADEMY}.

We are reviewing your form and will contact you shortly with next steps.

JazakAllah Khair.`;
}
function teacherApplicationFollowUpMessage(name) {
    const first = name.split(" ")[0] || name;
    return `Assalamu Alaikum ${first},

Thank you for applying to teach at ${ACADEMY}.

We have received your application and will review it soon.

JazakAllah Khair.`;
}
function classReminderWhatsAppMessage(input) {
    const first = input.recipientName.split(" ")[0] || input.recipientName;
    const roleLine = input.role === "teacher"
        ? `You teach *${input.partnerName}*`
        : `Your teacher is *${input.partnerName}*`;
    const lines = [
        `Assalamu Alaikum ${first},`,
        "",
        `Reminder from ${ACADEMY}: your class starts in *10 minutes*.`,
        "",
        `📖 ${input.classTitle}`,
        `🕐 ${input.timeLabel}`,
        roleLine,
    ];
    if (input.meetingLink?.trim()) {
        lines.push("", `Join class: ${input.meetingLink.trim()}`);
    }
    lines.push("", `Portal: ${input.portalUrl}`, "", "Please prepare your device, Quran, and notebook. JazakAllah Khair.");
    return lines.join("\n");
}
function classReminderEmailSubject(classTitle) {
    return `Class in 10 minutes — ${classTitle} | ${ACADEMY}`;
}
function classReminderPortalTitle() {
    return "Class starts in 10 minutes";
}
function classReminderPortalMessage(input) {
    const parts = [
        `${input.classTitle} with ${input.partnerName} at ${input.timeLabel}.`,
        "Please prepare your device and learning materials.",
    ];
    if (input.meetingLink?.trim()) {
        parts.push(`Join: ${input.meetingLink.trim()}`);
    }
    if (input.whatsAppUrl) {
        parts.push(`Save on WhatsApp: ${input.whatsAppUrl}`);
    }
    return parts.join(" ");
}
