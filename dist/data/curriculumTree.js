"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CURRICULUM_PROGRAMS = void 0;
const curriculumSurahs_1 = require("./curriculumSurahs");
const HIFZ_JUZ_AMMA_SURAHS = (0, curriculumSurahs_1.surahTopics)("hz-juz-amma");
const HIFZ_CUSTOM_SURAHS = (0, curriculumSurahs_1.surahTopics)("hz-custom");
const RECITE_SURAHS = (0, curriculumSurahs_1.surahTopics)("qr-intermediate");
/** Default master tree — 12 programs aligned with public-site TOPICS. */
exports.CURRICULUM_PROGRAMS = [
    {
        id: "quran-education",
        label: "Quran Education",
        labelBn: "কুরআন শিক্ষা",
        children: [
            {
                id: "qe-noorani-qaida",
                label: "Noorani Qaida",
                labelBn: "নূরানী কায়দা",
                children: [
                    { id: "qe-letters", label: "Arabic Letters", labelBn: "আরবি হরফ" },
                    { id: "qe-harakat", label: "Harakat & Sukoon", labelBn: "হরকত ও সুকুন" },
                    { id: "qe-words", label: "Word Formation", labelBn: "শব্দ গঠন" },
                    { id: "qe-connected", label: "Connected Reading", labelBn: "যুক্ত পাঠ" },
                ],
            },
            {
                id: "qe-reading",
                label: "Quran Reading Basics",
                labelBn: "কুরআন পড়ার ভিত্তি",
                children: [
                    { id: "qe-short-verses", label: "Short Verses", labelBn: "ছোট আয়াত" },
                    { id: "qe-fluency", label: "Reading Fluency", labelBn: "সাবলীল পাঠ" },
                    { id: "qe-daily-practice", label: "Daily Practice", labelBn: "দৈনিক অনুশীলন" },
                ],
            },
        ],
    },
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
        id: "tafsir",
        label: "Tafsirul Quran",
        labelBn: "তাফসীরুল কুরআন",
        children: [
            {
                id: "tf-short-surahs",
                label: "Short Surahs Tafsir",
                labelBn: "ছোট সূরার তাফসীর",
                children: [
                    { id: "tf-fatiha", label: "Surah Al-Fatiha", labelBn: "সূরা আল-ফাতিহা" },
                    { id: "tf-ikhlas", label: "Surah Al-Ikhlas", labelBn: "সূরা আল-ইখলাস" },
                    { id: "tf-yasin", label: "Surah Ya-Sin", labelBn: "সূরা ইয়াসীন" },
                ],
            },
            {
                id: "tf-thematic",
                label: "Thematic Tafsir",
                labelBn: "থিমভিত্তিক তাফসীর",
                children: [
                    { id: "tf-mercy", label: "Mercy & Forgiveness", labelBn: "রহমত ও ক্ষমা" },
                    { id: "tf-patience", label: "Patience & Trials", labelBn: "সবর ও পরীক্ষা" },
                    { id: "tf-family", label: "Family & Society", labelBn: "পরিবার ও সমাজ" },
                ],
            },
            {
                id: "tf-advanced",
                label: "Advanced Tafsir",
                labelBn: "উন্নত তাফসীর",
                children: [
                    { id: "tf-context", label: "Context & Asbab al-Nuzul", labelBn: "প্রেক্ষাপট" },
                    { id: "tf-compare", label: "Comparative Tafsir", labelBn: "তুলনামূলক তাফসীর" },
                ],
            },
        ],
    },
    {
        id: "seerah-history",
        label: "Seerah and History",
        labelBn: "সীরাহ এবং ইতিহাস",
        children: [
            {
                id: "sh-makkan",
                label: "Makkan Period",
                labelBn: "মক্কী যুগ",
                children: [
                    { id: "sh-birth", label: "Birth & Early Life", labelBn: "জন্ম ও শৈশব" },
                    { id: "sh-revelation", label: "First Revelation", labelBn: "প্রথম ওহী" },
                    { id: "sh-persecution", label: "Persecution in Makkah", labelBn: "মক্কায় নির্যাতন" },
                ],
            },
            {
                id: "sh-madinan",
                label: "Madinan Period",
                labelBn: "মদিনী যুগ",
                children: [
                    { id: "sh-hijrah", label: "Hijrah", labelBn: "হিজরত" },
                    { id: "sh-badr", label: "Battle of Badr", labelBn: "যুদ্ধে বদর" },
                    { id: "sh-uhud", label: "Battle of Uhud", labelBn: "যুদ্ধে উহুদ" },
                ],
            },
            {
                id: "sh-khulafa",
                label: "Khulafa Rashidun",
                labelBn: "খুলফায়ে রাশিদীন",
                children: [
                    { id: "sh-abubakr", label: "Abu Bakr (RA)", labelBn: "আবু বকর (রা.)" },
                    { id: "sh-umar", label: "Umar (RA)", labelBn: "উমর (রা.)" },
                    { id: "sh-uthman-ali", label: "Uthman & Ali (RA)", labelBn: "উসমান ও আলী (রা.)" },
                ],
            },
        ],
    },
    {
        id: "islamic-studies",
        label: "Islamic Studies",
        labelBn: "ইসলামিক স্টাডিজ",
        children: [
            {
                id: "is-aqeedah",
                label: "Aqeedah (Belief)",
                labelBn: "আকীদা",
                children: [
                    { id: "is-tawheed", label: "Tawheed", labelBn: "তাওহীদ" },
                    { id: "is-prophets", label: "Belief in Prophets", labelBn: "নবী-রাসূলের প্রতি ঈমান" },
                    { id: "is-akhirah", label: "Akhirah", labelBn: "আখিরাত" },
                ],
            },
            {
                id: "is-fiqh",
                label: "Fiqh & Worship",
                labelBn: "ফিকহ ও ইবাদত",
                children: [
                    { id: "is-taharah", label: "Taharah (Purification)", labelBn: "তাহারাত" },
                    { id: "is-salah", label: "Salah", labelBn: "নামাজ" },
                    { id: "is-fasting-zakat", label: "Fasting & Zakat", labelBn: "রোজা ও যাকাত" },
                ],
            },
            {
                id: "is-akhlaaq",
                label: "Akhlaaq & Character",
                labelBn: "আখলাক",
                children: [
                    { id: "is-honesty", label: "Honesty & Trust", labelBn: "সততা ও আমানত" },
                    { id: "is-kindness", label: "Kindness to Others", labelBn: "পরোপকার" },
                ],
            },
        ],
    },
    {
        id: "urdu",
        label: "Urdu Language Learning",
        labelBn: "উর্দু ভাষা শিক্ষা",
        children: [
            {
                id: "ur-alphabet",
                label: "Alphabet & Script",
                labelBn: "হরফ ও লিপি",
                children: [
                    { id: "ur-letters", label: "Urdu Letters", labelBn: "উর্দু হরফ" },
                    { id: "ur-joining", label: "Letter Joining", labelBn: "হরফ যুক্তি" },
                ],
            },
            {
                id: "ur-grammar",
                label: "Basic Grammar",
                labelBn: "প্রাথমিক ব্যাকরণ",
                children: [
                    { id: "ur-nouns", label: "Nouns & Pronouns", labelBn: "বিশেষ্য ও সর্বনাম" },
                    { id: "ur-sentences", label: "Simple Sentences", labelBn: "সহজ বাক্য" },
                ],
            },
            {
                id: "ur-conversation",
                label: "Conversation",
                labelBn: "কথোপকথন",
                children: [
                    { id: "ur-greetings", label: "Greetings & Daily Talk", labelBn: "শুভেচ্ছা ও দৈনন্দিন কথা" },
                    { id: "ur-classroom", label: "Classroom Urdu", labelBn: "ক্লাসরুম উর্দু" },
                ],
            },
        ],
    },
    {
        id: "tajweed",
        label: "Learning Tajweed",
        labelBn: "তাজভীদ শেখা",
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
        id: "hifz",
        label: "Hifzul Quran",
        labelBn: "হিফজুল কুরআন",
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
    {
        id: "surah-memorization",
        label: "Surah Memorization",
        labelBn: "সুরা মুখস্থ",
        children: [
            {
                id: "sm-essential",
                label: "Essential Short Surahs",
                labelBn: "অপরিহার্য ছোট সূরা",
                children: curriculumSurahs_1.SHORT_SURAHS,
            },
            {
                id: "sm-salah",
                label: "Surahs for Salah",
                labelBn: "নামাজের সূরা",
                children: [
                    { id: "sm-fatiha", label: "Al-Fatiha", labelBn: "আল-ফাতিহা" },
                    { id: "sm-juz-amma-core", label: "Core Juz Amma Surahs", labelBn: "জুজ আম্মার মূল সূরা" },
                ],
            },
        ],
    },
    {
        id: "adab",
        label: "Adab & Etiquette",
        labelBn: "আদব-কায়দা",
        children: [
            {
                id: "ad-personal",
                label: "Personal Adab",
                labelBn: "ব্যক্তিগত আদব",
                children: [
                    { id: "ad-hygiene", label: "Cleanliness & Hygiene", labelBn: "পবিত্রতা" },
                    { id: "ad-speech", label: "Speech & Truthfulness", labelBn: "কথা ও সততা" },
                ],
            },
            {
                id: "ad-social",
                label: "Social Adab",
                labelBn: "সামাজিক আদব",
                children: [
                    { id: "ad-parents", label: "Respect for Parents", labelBn: "পিতামাতার প্রতি সম্মান" },
                    { id: "ad-neighbors", label: "Neighbors & Guests", labelBn: "প্রতিবেশী ও অতিথি" },
                ],
            },
            {
                id: "ad-worship",
                label: "Worship Adab",
                labelBn: "ইবাদতের আদব",
                children: [
                    { id: "ad-masjid", label: "Masjid Etiquette", labelBn: "মসজিদের আদব" },
                    { id: "ad-quran-adab", label: "Adab with the Quran", labelBn: "কুরআনের আদব" },
                ],
            },
        ],
    },
    {
        id: "arabic",
        label: "Arabic Language Learning",
        labelBn: "আরবি ভাষা শিক্ষা",
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
        id: "english",
        label: "English Language Learning",
        labelBn: "ইংরেজি ভাষা শিক্ষা",
        children: [
            {
                id: "en-basics",
                label: "Basic English",
                labelBn: "প্রাথমিক ইংরেজি",
                children: [
                    { id: "en-alphabet", label: "Alphabet & Sounds", labelBn: "বর্ণ ও উচ্চারণ" },
                    { id: "en-greetings", label: "Greetings & Introductions", labelBn: "শুভেচ্ছা ও পরিচয়" },
                    { id: "en-daily", label: "Daily Vocabulary", labelBn: "দৈনন্দিন শব্দ" },
                ],
            },
            {
                id: "en-classroom",
                label: "Classroom English",
                labelBn: "ক্লাসরুম ইংরেজি",
                children: [
                    { id: "en-instructions", label: "Following Instructions", labelBn: "নির্দেশ ব follow" },
                    { id: "en-questions", label: "Asking Questions", labelBn: "প্রশ্ন করা" },
                ],
            },
            {
                id: "en-islamic",
                label: "Islamic English",
                labelBn: "ইসলামিক ইংরেজি",
                children: [
                    { id: "en-quran-terms", label: "Quran & Salah Terms", labelBn: "কুরআন ও নামাজের শব্দ" },
                    { id: "en-dua-phrases", label: "Common Duas in English", labelBn: "দোয়ার ইংরেজি" },
                ],
            },
        ],
    },
];
