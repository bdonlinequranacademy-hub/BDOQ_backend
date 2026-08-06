"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DIAL_CODE_BY_COUNTRY = void 0;
exports.parseWhatsApp = parseWhatsApp;
exports.buildWaMeUrl = buildWaMeUrl;
exports.waMeUrlFromRaw = waMeUrlFromRaw;
exports.normalizeWhatsAppForStorage = normalizeWhatsAppForStorage;
const countryTimezone_1 = require("./countryTimezone");
Object.defineProperty(exports, "DIAL_CODE_BY_COUNTRY", { enumerable: true, get: function () { return countryTimezone_1.DIAL_CODE_BY_COUNTRY; } });
const SORTED_DIAL_CODES = [...new Set(Object.values(countryTimezone_1.DIAL_CODE_BY_COUNTRY))].sort((a, b) => b.length - a.length);
function digitsOnly(raw) {
    return raw.replace(/\D/g, "");
}
function dialCodeForCountry(country) {
    if (!country?.trim())
        return undefined;
    const trimmed = country.trim();
    if (countryTimezone_1.DIAL_CODE_BY_COUNTRY[trimmed])
        return countryTimezone_1.DIAL_CODE_BY_COUNTRY[trimmed];
    const lower = trimmed.toLowerCase();
    const match = Object.entries(countryTimezone_1.DIAL_CODE_BY_COUNTRY).find(([name]) => name.toLowerCase() === lower);
    return match?.[1];
}
function detectInternationalDigits(digits) {
    for (const code of SORTED_DIAL_CODES) {
        if (digits.startsWith(code) && digits.length > code.length + 6) {
            return digits;
        }
    }
    return null;
}
function formatDisplay(waMeDigits) {
    return `+${waMeDigits.replace(/(\d{2,3})(\d{3,4})(\d+)/, "$1 $2 $3")}`;
}
function validateLength(waMeDigits) {
    if (waMeDigits.length < 10 || waMeDigits.length > 15) {
        return "WhatsApp number must be 10–15 digits including country code.";
    }
    if (waMeDigits.startsWith("0")) {
        return "Number cannot start with 0 after adding country code.";
    }
    return null;
}
/**
 * Normalize a WhatsApp number to E.164 / wa.me digits.
 * @param raw User input e.g. 01712-345678 or +44 7123 456789
 * @param countryHint Profile country e.g. Bangladesh — used when no + prefix
 */
function parseWhatsApp(raw, countryHint) {
    const trimmed = raw?.trim() ?? "";
    if (!trimmed) {
        return { ok: false, error: "WhatsApp number is required." };
    }
    let digits = digitsOnly(trimmed);
    if (!digits) {
        return { ok: false, error: "Enter a valid phone number." };
    }
    const hasPlus = trimmed.startsWith("+");
    let waMeDigits = null;
    if (hasPlus || detectInternationalDigits(digits)) {
        waMeDigits = detectInternationalDigits(digits) ?? digits;
    }
    else {
        const dial = dialCodeForCountry(countryHint);
        if (!dial) {
            return {
                ok: false,
                error: "Include country code (e.g. +880…) or set your country on your profile first.",
            };
        }
        let local = digits;
        if (local.startsWith("0"))
            local = local.slice(1);
        if (local.startsWith(dial)) {
            waMeDigits = local;
        }
        else {
            waMeDigits = `${dial}${local}`;
        }
    }
    const lengthError = validateLength(waMeDigits);
    if (lengthError) {
        return { ok: false, error: lengthError };
    }
    const parsed = {
        e164: `+${waMeDigits}`,
        waMeDigits,
        display: formatDisplay(waMeDigits),
    };
    return { ok: true, value: parsed };
}
function buildWaMeUrl(waMeDigits, message) {
    const base = `https://wa.me/${waMeDigits}`;
    if (!message?.trim())
        return base;
    return `${base}?text=${encodeURIComponent(message.trim())}`;
}
function waMeUrlFromRaw(raw, countryHint, message) {
    const parsed = parseWhatsApp(raw, countryHint);
    if (!parsed.ok)
        return null;
    return buildWaMeUrl(parsed.value.waMeDigits, message);
}
/** Store E.164 in database; empty string clears the field. */
function normalizeWhatsAppForStorage(raw, countryHint) {
    if (raw === undefined || raw === null) {
        return { ok: true, whatsapp: "" };
    }
    if (typeof raw !== "string") {
        return { ok: false, error: "WhatsApp must be a text value." };
    }
    const trimmed = raw.trim();
    if (!trimmed) {
        return { ok: true, whatsapp: "" };
    }
    const parsed = parseWhatsApp(trimmed, countryHint);
    if (!parsed.ok) {
        return { ok: false, error: parsed.error };
    }
    return { ok: true, whatsapp: parsed.value.e164 };
}
