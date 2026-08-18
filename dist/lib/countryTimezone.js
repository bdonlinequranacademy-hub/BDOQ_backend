"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_TIMEZONE = exports.BD_TIMEZONE = exports.COUNTRY_TIMEZONE_MAP = exports.DIAL_CODE_BY_COUNTRY = void 0;
exports.resolveTimezoneFromCountry = resolveTimezoneFromCountry;
exports.formatTrialLocalSchedule = formatTrialLocalSchedule;
exports.formatTrialBangladeshSchedule = formatTrialBangladeshSchedule;
const worldDialCodes_json_1 = __importDefault(require("./data/worldDialCodes.json"));
const worldTimezones_json_1 = __importDefault(require("./data/worldTimezones.json"));
const timezoneByIso = new Map();
for (const tz of worldTimezones_json_1.default) {
    if (!timezoneByIso.has(tz.iso)) {
        timezoneByIso.set(tz.iso, tz.value);
    }
}
const entries = worldDialCodes_json_1.default.map((row) => ({
    name: row.country,
    dialCode: row.dialCode.replace(/\D/g, ""),
    timezone: timezoneByIso.get(row.iso) ?? "UTC",
}));
/** Country name → international dial code (no +). */
exports.DIAL_CODE_BY_COUNTRY = Object.fromEntries(entries.map((entry) => [entry.name, entry.dialCode]));
exports.DIAL_CODE_BY_COUNTRY.UAE = exports.DIAL_CODE_BY_COUNTRY["United Arab Emirates"] ?? "971";
exports.COUNTRY_TIMEZONE_MAP = Object.fromEntries(entries.map((entry) => [entry.name, entry.timezone]));
exports.COUNTRY_TIMEZONE_MAP.UAE =
    exports.COUNTRY_TIMEZONE_MAP["United Arab Emirates"] ?? "Asia/Dubai";
exports.BD_TIMEZONE = "Asia/Dhaka";
exports.DEFAULT_TIMEZONE = exports.BD_TIMEZONE;
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
    const localLabel = new Intl.DateTimeFormat("en-US", {
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
    const bdLabel = new Intl.DateTimeFormat("en-US", {
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
