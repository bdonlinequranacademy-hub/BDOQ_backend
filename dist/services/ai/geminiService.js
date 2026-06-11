"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateClassLogDraft = exports.generateStudyPlan = exports.generateProgressReport = exports.generateEarlyWarning = exports.generateParentWeeklySummary = exports.GeminiQuotaError = void 0;
exports.buildFallbackEarlyWarning = buildFallbackEarlyWarning;
const genai_1 = require("@google/genai");
const aiLocale_1 = require("./aiLocale");
const aiErrors_1 = require("./aiErrors");
var aiErrors_2 = require("./aiErrors");
Object.defineProperty(exports, "GeminiQuotaError", { enumerable: true, get: function () { return aiErrors_2.GeminiQuotaError; } });
const callGemini = async (systemPrompt, userPrompt, maxOutputTokens) => {
    try {
        const ai = new genai_1.GoogleGenAI({
            apiKey: process.env.GEMINI_API_KEY,
        });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: userPrompt,
            config: {
                systemInstruction: systemPrompt,
                temperature: 0.65,
                maxOutputTokens,
                thinkingConfig: {
                    thinkingBudget: 0,
                },
            },
        });
        const text = response.text?.trim() ?? "";
        if (!text) {
            throw new Error("AI returned an empty response");
        }
        return text;
    }
    catch (error) {
        throw (0, aiErrors_1.toGeminiError)(error);
    }
};
function buildFallbackEarlyWarning(data) {
    const reasonLines = data.reasons.map((r) => `- ${r}`).join("\n");
    if (data.locale === "en") {
        return `## Recommended actions
- Contact **${data.studentName}** or their guardian within 48 hours
- Review attendance (${data.missedClasses}/${data.totalClasses} missed) and homework (${data.homeworkMissed}/${data.totalHomework} incomplete)
- Schedule a short check-in and assign targeted revision if needed

## Risk signals
${reasonLines || "- Multiple progress indicators need attention"}

## Tajweed & attendance
- Tajweed trend: **${data.tajweedScoreTrend}**
- Last attendance: **${data.lastAttendanceDate}**`;
    }
    return `## প্রস্তাবিত পদক্ষেপ
- **${data.studentName}** বা অভিভাবকের সাথে ৪৮ ঘণ্টার মধ্যে যোগাযোগ করুন
- উপস্থিতি (${data.missedClasses}/${data.totalClasses} মিস) ও হোমওয়ার্ক (${data.homeworkMissed}/${data.totalHomework} অসম্পূর্ণ) পর্যালোচনা করুন
- সংক্ষিপ্ত check-in ও প্রয়োজনমতো revision দিন

## ঝুঁকির কারণ
${reasonLines || "- একাধিক progress indicator মনোযোগ দরকার"}

## তাজওয়ীদ ও উপস্থিতি
- তাজওয়ীদ: **${data.tajweedScoreTrend}**
- সর্বশেষ উপস্থিতি: **${data.lastAttendanceDate}**`;
}
const generateParentWeeklySummary = async (data) => {
    const { locale } = data;
    const systemPrompt = `You are an AI assistant for Al Bayaan Academy (Islamic/Quran education).
Your job is to write a weekly progress update for parents.
${(0, aiLocale_1.languageRule)(locale)}
${(0, aiLocale_1.greetingRule)(locale)}
${(0, aiLocale_1.markdownFormatRule)()}
Tone: warm, positive, encouraging. Mention zeros honestly if data is 0.
Length: 80–150 words total.`;
    const surahsText = data.surahsCompleted.length > 0
        ? data.surahsCompleted.join(", ")
        : locale === "en"
            ? "None recorded"
            : "কোনো সূরা নেই";
    const noNote = locale === "en" ? "No teacher note" : "কোনো মন্তব্য নেই";
    const userPrompt = locale === "en"
        ? `Write a weekly parent summary using this data:

Student: ${data.studentName}
Week: ${data.weekStart} to ${data.weekEnd}
Classes scheduled: ${data.totalClasses}
Attended: ${data.attendedClasses}
Homework assigned: ${data.homeworkAssigned}
Homework submitted: ${data.homeworkSubmitted}
Tajweed score: ${data.tajweedScore}/100
Surahs completed: ${surahsText}
Teacher notes: ${data.teacherNote || noNote}

Suggested sections: ## This week, ## Attendance & homework, ## Encouragement`
        : `নিচের তথ্য দিয়ে parent কে সাপ্তাহিক রিপোর্ট লেখো:

ছাত্রের নাম: ${data.studentName}
সপ্তাহ: ${data.weekStart} থেকে ${data.weekEnd}
মোট ক্লাস: ${data.totalClasses}
উপস্থিত: ${data.attendedClasses}
হোমওয়ার্ক দেওয়া: ${data.homeworkAssigned}
হোমওয়ার্ক জমা: ${data.homeworkSubmitted}
তাজওয়ীদ: ${data.tajweedScore}/100
সূরা: ${surahsText}
শিক্ষকের মন্তব্য: ${data.teacherNote || noNote}`;
    return callGemini(systemPrompt, userPrompt, 1024);
};
exports.generateParentWeeklySummary = generateParentWeeklySummary;
const generateEarlyWarning = async (data) => {
    const { locale } = data;
    const systemPrompt = `You are an AI assistant for Al Bayaan Academy.
Help teachers respond to at-risk students with specific, actionable advice.
${(0, aiLocale_1.languageRule)(locale)}
${(0, aiLocale_1.markdownFormatRule)()}
Max 120 words. Be direct and practical.`;
    const userPrompt = locale === "en"
        ? `Student at risk — write guidance for the teacher:

Name: ${data.studentName}
Missed classes: ${data.missedClasses}/${data.totalClasses}
Missed homework: ${data.homeworkMissed}/${data.totalHomework}
Tajweed trend: ${data.tajweedScoreTrend}
Last attendance: ${data.lastAttendanceDate}
Risk factors:
${data.reasons.map((r) => `- ${r}`).join("\n")}

Sections: ## Priority actions, ## Talking points, ## Follow-up`
        : `At-risk student — শিক্ষকের জন্য guidance লেখো:

নাম: ${data.studentName}
মিস করা ক্লাস: ${data.missedClasses}/${data.totalClasses}
মিস করা হোমওয়ার্ক: ${data.homeworkMissed}/${data.totalHomework}
তাজওয়ীদ: ${data.tajweedScoreTrend}
সর্বশেষ উপস্থিতি: ${data.lastAttendanceDate}
ঝুঁকির কারণ:
${data.reasons.map((r) => `- ${r}`).join("\n")}`;
    return callGemini(systemPrompt, userPrompt, 768);
};
exports.generateEarlyWarning = generateEarlyWarning;
const generateProgressReport = async (data) => {
    const { locale } = data;
    const systemPrompt = `You are an AI assistant for Al Bayaan Academy.
Analyze overall student progress and produce a detailed report for teachers.
${(0, aiLocale_1.languageRule)(locale)}
${(0, aiLocale_1.markdownFormatRule)()}
Cover strengths, areas to improve, and concrete next steps. Max 220 words.`;
    const surahsText = data.surahsCompleted.length > 0
        ? data.surahsCompleted.join(", ")
        : locale === "en"
            ? "None recorded"
            : "কোনো সূরা নেই";
    const noNote = locale === "en" ? "No teacher note" : "কোনো মন্তব্য নেই";
    const userPrompt = locale === "en"
        ? `Progress report for:

Student: ${data.studentName}
Classes: ${data.className}
Tajweed: ${data.tajweedScore}/100
Memorized ayahs: ${data.memorizedAyahs}
Surahs: ${surahsText}
Attendance: ${data.attendancePercentage}%
Homework completion: ${data.homeworkCompletionRate}%
Teacher notes: ${data.teacherNotes || noNote}

Sections: ## Overview, ## Strengths, ## Focus areas, ## Recommended next steps`
        : `Student progress বিশ্লেষণ করে রিপোর্ট লেখো:

নাম: ${data.studentName}
ক্লাস: ${data.className}
তাজওয়ীদ: ${data.tajweedScore}/100
মুখস্ত আয়াত: ${data.memorizedAyahs}
সূরা: ${surahsText}
উপস্থিতি: ${data.attendancePercentage}%
হোমওয়ার্ক: ${data.homeworkCompletionRate}%
মন্তব্য: ${data.teacherNotes || noNote}`;
    return callGemini(systemPrompt, userPrompt, 1536);
};
exports.generateProgressReport = generateProgressReport;
const generateStudyPlan = async (data) => {
    const { locale } = data;
    const systemPrompt = `You are an AI assistant for Al Bayaan Academy.
Create a realistic, achievable personalized study plan.
${(0, aiLocale_1.languageRule)(locale)}
${(0, aiLocale_1.markdownFormatRule)()}
Include a week-by-week breakdown. Max 280 words.`;
    const surahsText = data.surahsCompleted.length > 0
        ? data.surahsCompleted.join(", ")
        : locale === "en"
            ? "None yet"
            : "কোনো সূরা নেই";
    const userPrompt = locale === "en"
        ? `Study plan for:

Student: ${data.studentName}
Level: ${data.currentLevel}
Surahs done: ${surahsText}
Tajweed: ${data.tajweedScore}/100
Goal: ${data.targetGoal}
Days/week: ${data.availableDaysPerWeek}
Minutes/day: ${data.minutesPerDay}

Sections: ## Goal, ## Weekly schedule, ## Daily routine, ## Tips`
        : `Personalized study plan তৈরি করো:

নাম: ${data.studentName}
স্তর: ${data.currentLevel}
সূরা: ${surahsText}
তাজওয়ীদ: ${data.tajweedScore}/100
লক্ষ্য: ${data.targetGoal}
দিন/সপ্তাহ: ${data.availableDaysPerWeek}
মিনিট/দিন: ${data.minutesPerDay}`;
    return callGemini(systemPrompt, userPrompt, 1536);
};
exports.generateStudyPlan = generateStudyPlan;
const generateClassLogDraft = async (data) => {
    const systemPrompt = `You are an assistant for an online Quran academy.
Write a concise professional class session log for the teacher to submit.
Use clear English with short paragraphs or bullet points.
Include: what was covered, tajweed focus, student performance, homework if any.
Keep it 80–150 words. No greetings or sign-offs.`;
    const userPrompt = `Draft a lesson report for today's session:

Student: ${data.studentName}
Class: ${data.classTitle} (${data.courseType})
Session date: ${data.sessionDate}
Duration: ${data.durationMinutes} minutes
Teacher's topic notes: ${data.topicsHint || "General Quran lesson"}
Recent approved logs for context:
${data.recentLogs || "No previous logs on file."}`;
    return callGemini(systemPrompt, userPrompt, 512);
};
exports.generateClassLogDraft = generateClassLogDraft;
