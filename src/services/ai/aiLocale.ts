export type AiLocale = "en" | "bn";

export function parseAiLocale(value: unknown): AiLocale {
  return value === "en" ? "en" : "bn";
}

export function languageRule(locale: AiLocale): string {
  if (locale === "en") {
    return "Write ALL content in clear, professional English for parents and teachers.";
  }
  return "সম্পূর্ণ বিষয়বস্তু সুন্দর, সহজ বাংলায় লিখবে (parents ও teachers এর জন্য উপযুক্ত)।";
}

export function markdownFormatRule(): string {
  return `Format the response as clean Markdown:
- Open with one warm greeting line
- Use ## for section headings (2–4 sections)
- Use bullet lists (-) for key points
- Use **bold** for important numbers or metrics
- Keep paragraphs short (2–3 sentences)
- Close with one encouraging line
Do NOT wrap the response in a code block.`;
}

export function greetingRule(locale: AiLocale): string {
  if (locale === "en") {
    return 'Open with "Assalamu Alaikum," then continue in English.';
  }
  return "শুরু করবে 'আস-সালামু আলাইকুম,' দিয়ে, তারপর বাংলায় চালিয়ে যাবে।";
}
