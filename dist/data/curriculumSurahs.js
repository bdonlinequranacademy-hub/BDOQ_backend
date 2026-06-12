"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SELECTABLE_SURAHS = void 0;
exports.surahTopics = surahTopics;
/** Common surahs selectable at student assignment & homework (topic level). */
exports.SELECTABLE_SURAHS = [
    "Al-Fatiha",
    "Al-Baqarah",
    "Al-Imran",
    "An-Nisa",
    "Al-Maidah",
    "Ya-Sin",
    "Ar-Rahman",
    "Al-Mulk",
    "Al-Qalam",
    "Al-Muzzammil",
    "Al-Muddaththir",
    "Al-Qadr",
    "Al-Alaq",
    "At-Tin",
    "Ash-Sharh",
    "Al-Fil",
    "Al-Falaq",
    "An-Nas",
    "Al-Ikhlas",
    "Al-Kawthar",
    "Al-Asr",
    "Al-Humazah",
];
function surahTopics(prefix) {
    return exports.SELECTABLE_SURAHS.map((name) => ({
        id: `${prefix}-surah-${slugify(name)}`,
        label: name,
        labelBn: name,
    }));
}
function slugify(name) {
    return name
        .toLowerCase()
        .replace(/['']/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}
