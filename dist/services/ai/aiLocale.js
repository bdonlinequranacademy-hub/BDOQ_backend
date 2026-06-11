"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseAiLocale = parseAiLocale;
exports.languageRule = languageRule;
exports.markdownFormatRule = markdownFormatRule;
exports.greetingRule = greetingRule;
function parseAiLocale(value) {
    return value === "en" ? "en" : "bn";
}
function languageRule(locale) {
    if (locale === "en") {
        return "Write ALL content in clear, professional English for parents and teachers.";
    }
    return "সম্পূর্ণ বিষয়বস্তু সুন্দর, সহজ বাংলায় লিখবে (parents ও teachers এর জন্য উপযুক্ত)।";
}
function markdownFormatRule() {
    return `Format the response as clean Markdown:
- Open with one warm greeting line
- Use ## for section headings (2–4 sections)
- Use bullet lists (-) for key points
- Use **bold** for important numbers or metrics
- Keep paragraphs short (2–3 sentences)
- Close with one encouraging line
Do NOT wrap the response in a code block.`;
}
function greetingRule(locale) {
    if (locale === "en") {
        return 'Open with "Assalamu Alaikum," then continue in English.';
    }
    return "শুরু করবে 'আস-সালামু আলাইকুম,' দিয়ে, তারপর বাংলায় চালিয়ে যাবে।";
}
