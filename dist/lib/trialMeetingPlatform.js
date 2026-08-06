"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TRIAL_MEETING_PLATFORMS = void 0;
exports.parseTrialMeetingPlatform = parseTrialMeetingPlatform;
exports.formatTrialMeetingPlatform = formatTrialMeetingPlatform;
exports.normalizeMeetingLink = normalizeMeetingLink;
exports.TRIAL_MEETING_PLATFORMS = [
    "google_meet",
    "zoom",
    "teams",
    "whatsapp",
    "custom",
];
const PLATFORM_LABELS = {
    google_meet: "Google Meet",
    zoom: "Zoom",
    teams: "Microsoft Teams",
    whatsapp: "WhatsApp",
    custom: "Custom",
};
function parseTrialMeetingPlatform(value) {
    if (typeof value !== "string")
        return undefined;
    return exports.TRIAL_MEETING_PLATFORMS.includes(value)
        ? value
        : undefined;
}
function formatTrialMeetingPlatform(platform) {
    if (!platform)
        return "Not set";
    return PLATFORM_LABELS[platform] ?? platform;
}
function normalizeMeetingLink(raw) {
    const trimmed = raw?.trim();
    if (!trimmed)
        return undefined;
    if (/^https?:\/\//i.test(trimmed))
        return trimmed;
    if (/^(mailto|tel):/i.test(trimmed))
        return trimmed;
    return `https://${trimmed}`;
}
