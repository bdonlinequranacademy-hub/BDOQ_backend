"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SHORT_SURAHS = exports.SHORT_MEMORIZATION_SURAHS = exports.SELECTABLE_SURAHS = void 0;
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
/** Short surahs for the Surah Memorization program (Juz Amma focus). */
exports.SHORT_MEMORIZATION_SURAHS = [
    "An-Nas",
    "Al-Falaq",
    "Al-Ikhlas",
    "Al-Kawthar",
    "Al-Asr",
    "Al-Fil",
    "Al-Qadr",
    "Al-Alaq",
    "At-Tin",
    "Ash-Sharh",
    "Al-Muzzammil",
    "Al-Muddaththir",
];
function surahTopics(prefix, names = exports.SELECTABLE_SURAHS) {
    return names.map((name) => ({
        id: `${prefix}-surah-${slugify(name)}`,
        label: name,
        labelBn: name,
    }));
}
exports.SHORT_SURAHS = surahTopics("sm-short", exports.SHORT_MEMORIZATION_SURAHS);
function slugify(name) {
    return name
        .toLowerCase()
        .replace(/['']/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}
