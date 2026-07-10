"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CURRICULUM_TREE_VERSION = exports.LEGACY_PROGRAM_ID_MAP = exports.CURRICULUM_PROGRAM_IDS = void 0;
exports.normalizeProgramId = normalizeProgramId;
exports.programUsesSurahPicker = programUsesSurahPicker;
exports.programUsesTajweedPicker = programUsesTajweedPicker;
exports.programUsesGrammarPicker = programUsesGrammarPicker;
/** Matches public-site TOPICS ids — single source for program slugs. */
exports.CURRICULUM_PROGRAM_IDS = [
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
];
/** Maps old DB/API ids to current program ids. */
exports.LEGACY_PROGRAM_ID_MAP = {
    "arabic-language": "arabic",
    "quran-memorisation": "hifz",
    "quran-tajweed": "tajweed",
};
exports.CURRICULUM_TREE_VERSION = 2;
function normalizeProgramId(programId) {
    return exports.LEGACY_PROGRAM_ID_MAP[programId] ?? programId;
}
function programUsesSurahPicker(programId) {
    const id = normalizeProgramId(programId);
    return id === "hifz" || id === "surah-memorization" || id === "quran-recitation";
}
function programUsesTajweedPicker(programId) {
    return normalizeProgramId(programId) === "tajweed";
}
function programUsesGrammarPicker(programId, sectionId) {
    return normalizeProgramId(programId) === "arabic" && sectionId === "ar-grammar";
}
