"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_TIMEZONE = exports.BD_TIMEZONE = exports.COUNTRY_TIMEZONE_MAP = void 0;
exports.resolveTimezoneFromCountry = resolveTimezoneFromCountry;
exports.formatTrialLocalSchedule = formatTrialLocalSchedule;
exports.formatTrialBangladeshSchedule = formatTrialBangladeshSchedule;
exports.COUNTRY_TIMEZONE_MAP = {
    Bangladesh: "Asia/Dhaka",
    Australia: "Australia/Sydney",
    "United Kingdom": "Europe/London",
    "United States": "America/New_York",
    Canada: "America/Toronto",
    "Saudi Arabia": "Asia/Riyadh",
    UAE: "Asia/Dubai",
    Qatar: "Asia/Qatar",
    Malaysia: "Asia/Kuala_Lumpur",
    Japan: "Asia/Tokyo",
    Germany: "Europe/Berlin",
    Pakistan: "Asia/Karachi",
    Indonesia: "Asia/Jakarta",
    Turkey: "Europe/Istanbul",
    Egypt: "Africa/Cairo",
    India: "Asia/Kolkata",
    Singapore: "Asia/Singapore",
    "New Zealand": "Pacific/Auckland",
    Mexico: "America/Mexico_City",
    France: "Europe/Paris",
};
exports.BD_TIMEZONE = "Asia/Dhaka";
exports.DEFAULT_TIMEZONE = exports.COUNTRY_TIMEZONE_MAP.Bangladesh;
function resolveTimezoneFromCountry(country) {
    const trimmed = country.trim();
    return exports.COUNTRY_TIMEZONE_MAP[trimmed] ?? exports.DEFAULT_TIMEZONE;
}
function getTimezoneOffsetMs(timeZone, date) {
    const utc = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
    const zoned = new Date(date.toLocaleString("en-US", { timeZone }));
    return zoned.getTime() - utc.getTime();
}
function zonedLocalToUtc(date, time, timeZone) {
    const local = new Date(`${date}T${time}:00`);
    return new Date(local.getTime() - getTimezoneOffsetMs(timeZone, local));
}
function formatTrialLocalSchedule(date, time, timeZone) {
    if (!date?.trim() || !time?.trim())
        return null;
    const tz = timeZone?.trim() || exports.DEFAULT_TIMEZONE;
    const [year, month, day] = date.split("-").map(Number);
    const [hour, minute] = time.split(":").map(Number);
    if (!year || !month || !day || Number.isNaN(hour) || Number.isNaN(minute)) {
        return `${date} ${time} (${tz})`;
    }
    const localLabel = new Intl.DateTimeFormat("en-GB", {
        timeZone: tz,
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    }).format(zonedLocalToUtc(date, time, tz));
    return `${localLabel} (${tz})`;
}
function formatTrialBangladeshSchedule(date, time, sourceTimeZone) {
    if (!date?.trim() || !time?.trim())
        return null;
    const sourceTz = sourceTimeZone?.trim() || exports.DEFAULT_TIMEZONE;
    const utc = zonedLocalToUtc(date, time, sourceTz);
    const bdLabel = new Intl.DateTimeFormat("en-GB", {
        timeZone: exports.BD_TIMEZONE,
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    }).format(utc);
    return `${bdLabel} (Bangladesh Time)`;
}
