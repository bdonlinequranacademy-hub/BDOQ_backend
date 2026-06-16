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
        return "Write ALL content in clear, professional English only. Do NOT use Bengali script, Banglish, or Romanized Bengali (e.g. avoid phrases like 'dui maasher advance'). Use standard English for parents and teachers.";
    }
    return "Write ALL content in clear, professional English only. Do NOT use Bengali script, Banglish, or Romanized Bengali.";
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
    return 'Open with "Assalamu Alaikum," then continue in English.';
}
