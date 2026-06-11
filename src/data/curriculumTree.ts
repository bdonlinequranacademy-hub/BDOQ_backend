import { surahTopics } from "./curriculumSurahs";

export interface CurriculumNode {
  id: string;
  label: string;
  labelBn?: string;
  children?: CurriculumNode[];
}

const HIFZ_JUZ_AMMA_SURAHS = surahTopics("hz-juz-amma");
const HIFZ_CUSTOM_SURAHS = surahTopics("hz-custom");
const RECITE_SURAHS = surahTopics("qr-intermediate");

export const CURRICULUM_PROGRAMS: CurriculumNode[] = [
  {
    id: "quran-recitation",
    label: "Quran Recitation",
    labelBn: "কুরআন তিলাওয়াত",
    children: [
      {
        id: "qr-beginner",
        label: "Beginner Recitation",
        labelBn: "প্রাথমিক তিলাওয়াত",
        children: [
          { id: "qr-letters-makhraj", label: "Arabic Letters & Makhraj", labelBn: "হুরুফ ও মাখরাজ" },
          { id: "qr-short-surahs", label: "Short Surahs (Juz Amma)", labelBn: "ছোট সূরা (৩০তম পারা)" },
          { id: "qr-daily-practice", label: "Daily Recitation Practice", labelBn: "দৈনিক তিলাওয়াত" },
        ],
      },
      {
        id: "qr-intermediate",
        label: "Intermediate Recitation",
        labelBn: "মধ্যম তিলাওয়াত",
        children: [
          { id: "qr-juz-30", label: "Juz 30 Full", labelBn: "৩০তম পারা সম্পূর্ণ" },
          ...RECITE_SURAHS,
        ],
      },
      {
        id: "qr-advanced",
        label: "Advanced Tilawah",
        labelBn: "উন্নত তিলাওয়াত",
        children: [
          { id: "qr-multiple-ajza", label: "Multiple Ajza", labelBn: "একাধিক পারা" },
          { id: "qr-tilawah-refinement", label: "Tilawah Refinement", labelBn: "তিলাওয়াত পরিমার্জন" },
        ],
      },
    ],
  },
  {
    id: "tajweed",
    label: "Tajweed Rules",
    labelBn: "তাজওয়ীদ নিয়ম",
    children: [
      {
        id: "tj-foundation",
        label: "Foundation Rules",
        labelBn: "মৌলিক নিয়ম",
        children: [
          { id: "tj-noon-tanween", label: "Noon Sakinah & Tanween", labelBn: "নূন সাকিন ও তানউইন" },
          { id: "tj-meem-sakin", label: "Meem Sakinah", labelBn: "মীম সাকিন" },
          { id: "tj-qalqalah", label: "Qalqalah", labelBn: "কলকলাহ" },
        ],
      },
      {
        id: "tj-madd",
        label: "Madd Rules",
        labelBn: "মাদ্দ নিয়ম",
        children: [
          { id: "tj-madd-tabee", label: "Madd Tabee'i", labelBn: "মাদ্দ তবঈ" },
          { id: "tj-madd-muttasil-munfasil", label: "Madd Muttasil & Munfasil", labelBn: "মাদ্দ মুতtasil ও মুনফasil" },
          { id: "tj-madd-lazim", label: "Madd Lazim", labelBn: "মাদ্দ লাজিম" },
        ],
      },
      {
        id: "tj-advanced",
        label: "Advanced Rules",
        labelBn: "উন্নত নিয়ম",
        children: [
          { id: "tj-waqf-ibtida", label: "Waqf & Ibtida", labelBn: "ওকফ ও ইবতিদা" },
          { id: "tj-ghunnah-idgham", label: "Ghunnah & Idgham", labelBn: "গুন্নাহ ও ইদগাম" },
        ],
      },
    ],
  },
  {
    id: "arabic-language",
    label: "Arabic Language",
    labelBn: "আরবি ভাষা",
    children: [
      {
        id: "ar-reading-writing",
        label: "Reading & Writing",
        labelBn: "পড়া ও লেখা",
        children: [
          { id: "ar-alphabet", label: "Arabic Alphabet", labelBn: "আরবি বর্ণমালা" },
          { id: "ar-harakat", label: "Harakat & Sukoon", labelBn: "হরকত ও সুকুন" },
          { id: "ar-joining", label: "Joining Letters", labelBn: "অক্ষর যুক্তি" },
        ],
      },
      {
        id: "ar-grammar",
        label: "Grammar (Nahw)",
        labelBn: "ব্যাকরণ (নাহু)",
        children: [
          { id: "ar-nouns-verbs", label: "Nouns & Verbs (Ism & Fi'l)", labelBn: "বিশেষ্য ও ক্রিয়া" },
          { id: "ar-sentences", label: "Sentence Structure (Jumla)", labelBn: "বাক্য গঠন" },
          { id: "ar-irab", label: "I'rab (Case Endings)", labelBn: "ইআরাব" },
          { id: "ar-huruf", label: "Huruf (Prepositions & Particles)", labelBn: "হুরুফ" },
          { id: "ar-pronouns", label: "Pronouns (Dama'ir)", labelBn: "সর্বনাম" },
        ],
      },
      {
        id: "ar-quranic-vocab",
        label: "Quranic Vocabulary",
        labelBn: "কুরআনি শব্দভাণ্ডার",
        children: [
          { id: "ar-salah-words", label: "Common Words in Salah", labelBn: "নামাজের শব্দ" },
          { id: "ar-fatiha-vocab", label: "Surah Al-Fatiha Vocabulary", labelBn: "সূরা ফাতিহা শব্দ" },
        ],
      },
    ],
  },
  {
    id: "quran-memorisation",
    label: "Quran Memorisation (Hifz)",
    labelBn: "কুরআন মুখস্থ (হিফজ)",
    children: [
      {
        id: "hz-foundations",
        label: "Hifz Foundations",
        labelBn: "হিফজ ভিত্তি",
        children: [
          { id: "hz-techniques", label: "Memorisation Techniques", labelBn: "মুখস্থ কৌশল" },
          { id: "hz-murajaah", label: "Daily Revision (Muraja'ah)", labelBn: "দৈনিক মুরাজাআহ" },
        ],
      },
      {
        id: "hz-juz-amma",
        label: "Juz Amma Track",
        labelBn: "৩০তম পারা ট্র্যাক",
        children: HIFZ_JUZ_AMMA_SURAHS,
      },
      {
        id: "hz-custom",
        label: "Custom Hifz Plan",
        labelBn: "কাস্টম হিফজ পরিকল্পনা",
        children: [
          { id: "hz-full-juz", label: "Full Juz (teacher picks)", labelBn: "সম্পূর্ণ পারা" },
          ...HIFZ_CUSTOM_SURAHS,
        ],
      },
    ],
  },
];
