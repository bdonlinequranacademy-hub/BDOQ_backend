"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scanComplianceText = scanComplianceText;
exports.assessLogQuality = assessLogQuality;
exports.combineScanWarnings = combineScanWarnings;
const BLOCK_PATTERNS = [
    { label: "direct payment request", pattern: /\b(bkash|b-kash|nagad|rocket)\b/i },
    { label: "WhatsApp / off-platform contact", pattern: /\b(whatsapp|whats app|telegram|imo)\b/i },
    { label: "pay outside platform", pattern: /\b(pay me|send me|personal(ly)?\s+(rate|payment|fee|class))\b/i },
    { label: "leave platform", pattern: /\b(leave (the )?platform|off platform|without platform|book direct(ly)?)\b/i },
    { label: "private tutoring pitch", pattern: /\b(private(ly)?\s+(teach|lesson|class|tuition))\b/i },
    { label: "Bengali payment/contact", pattern: /(বিকাশ|নগদ|হোয়াটসঅ্যাপ|ব্যক্তিগত|প্ল্যাটফর্ম ছাড়)/i },
];
const WARN_PATTERNS = [
    { label: "phone number", pattern: /(?:\+?\d{1,3}[\s-]?)?(?:0)?1[3-9]\d{8}\b/ },
    { label: "personal email", pattern: /\b[A-Z0-9._%+-]+@(?!albayaan|myacademy)[A-Z0-9.-]+\.[A-Z]{2,}\b/i },
    { label: "social handle", pattern: /\b@[a-z0-9._]{3,}\b/i },
];
const VAGUE_LOG_PATTERNS = [
    /^good class\.?$/i,
    /^ok\.?$/i,
    /^done\.?$/i,
    /^class went well\.?$/i,
    /^nothing special\.?$/i,
    /^regular class\.?$/i,
];
function scanComplianceText(text) {
    const normalized = text.trim();
    if (!normalized) {
        return {
            passed: true,
            severity: "ok",
            matches: [],
            message: "",
        };
    }
    const blockMatches = BLOCK_PATTERNS.filter(({ pattern }) => pattern.test(normalized)).map(({ label }) => label);
    if (blockMatches.length > 0) {
        return {
            passed: false,
            severity: "block",
            matches: blockMatches,
            message: "This text may ask for off-platform payment or contact. Please remove personal payment or contact details.",
        };
    }
    const warnMatches = WARN_PATTERNS.filter(({ pattern }) => pattern.test(normalized)).map(({ label }) => label);
    if (warnMatches.length > 0) {
        return {
            passed: true,
            severity: "warn",
            matches: warnMatches,
            message: "Possible personal contact info detected. Admin may review this entry.",
        };
    }
    return {
        passed: true,
        severity: "ok",
        matches: [],
        message: "",
    };
}
function assessLogQuality(lessonReport, options) {
    const text = lessonReport.trim();
    const issues = [];
    if (text.length < 60) {
        issues.push("Report is too short (minimum 60 characters).");
    }
    if (VAGUE_LOG_PATTERNS.some((pattern) => pattern.test(text))) {
        issues.push("Report is too vague — describe what was taught or corrected.");
    }
    if (options?.previousReport &&
        options.previousReport.trim().toLowerCase() === text.toLowerCase()) {
        issues.push("This report matches your previous log word-for-word.");
    }
    if (issues.some((i) => i.includes("too short") || i.includes("too vague"))) {
        return {
            passed: false,
            severity: "block",
            issues,
            message: issues.join(" "),
        };
    }
    if (text.length < 120) {
        issues.push("Consider adding more detail for admin review.");
    }
    if (issues.length > 0) {
        return {
            passed: true,
            severity: "warn",
            issues,
            message: issues.join(" "),
        };
    }
    return {
        passed: true,
        severity: "ok",
        issues: [],
        message: "",
    };
}
function combineScanWarnings(compliance, quality) {
    const warnings = [];
    if (compliance.severity === "warn" && compliance.message) {
        warnings.push(compliance.message);
    }
    if (quality?.severity === "warn" && quality.message) {
        warnings.push(quality.message);
    }
    return warnings;
}
