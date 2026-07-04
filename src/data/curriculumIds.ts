/** Matches public-site TOPICS ids — single source for program slugs. */
export const CURRICULUM_PROGRAM_IDS = [
  "quran-education",
  "quran-recitation",
  "tafsir",
  "seerah-history",
  "islamic-studies",
  "urdu",
  "tajweed",
  "hifz",
  "surah-memorization",
  "adab",
  "arabic",
  "english",
] as const;

export type CurriculumProgramId = (typeof CURRICULUM_PROGRAM_IDS)[number];

/** Maps old DB/API ids to current program ids. */
export const LEGACY_PROGRAM_ID_MAP: Record<string, CurriculumProgramId> = {
  "arabic-language": "arabic",
  "quran-memorisation": "hifz",
  "quran-tajweed": "tajweed",
};

export const CURRICULUM_TREE_VERSION = 2;

export function normalizeProgramId(programId: string): string {
  return LEGACY_PROGRAM_ID_MAP[programId] ?? programId;
}

export function programUsesSurahPicker(programId: string): boolean {
  const id = normalizeProgramId(programId);
  return id === "hifz" || id === "surah-memorization" || id === "quran-recitation";
}

export function programUsesTajweedPicker(programId: string): boolean {
  return normalizeProgramId(programId) === "tajweed";
}

export function programUsesGrammarPicker(programId: string, sectionId: string): boolean {
  return normalizeProgramId(programId) === "arabic" && sectionId === "ar-grammar";
}
