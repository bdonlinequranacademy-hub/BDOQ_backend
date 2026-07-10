"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeMeetingLink = normalizeMeetingLink;
/** Normalize stored meeting URLs so clients never treat them as site-relative paths. */
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
