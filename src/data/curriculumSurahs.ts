/** Common surahs selectable at student assignment & homework (topic level). */
export const SELECTABLE_SURAHS = [
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
export const SHORT_MEMORIZATION_SURAHS = [
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

export function surahTopics(
  prefix: string,
  names: readonly string[] = SELECTABLE_SURAHS
): { id: string; label: string; labelBn: string }[] {
  return names.map((name) => ({
    id: `${prefix}-surah-${slugify(name)}`,
    label: name,
    labelBn: name,
  }));
}

export const SHORT_SURAHS = surahTopics("sm-short", SHORT_MEMORIZATION_SURAHS);

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
