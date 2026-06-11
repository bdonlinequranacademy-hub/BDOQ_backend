"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEnv = validateEnv;
const PLACEHOLDER = /^(your-|change-me|comming|coming soon|$)/i;
function isSet(value) {
    return Boolean(value?.trim() && !PLACEHOLDER.test(value.trim()));
}
function validateEnv() {
    const missing = [];
    if (!isSet(process.env.MONGO_URI))
        missing.push("MONGO_URI");
    if (!isSet(process.env.JWT_SECRET))
        missing.push("JWT_SECRET");
    if (missing.length > 0) {
        console.error(`[env] Missing required variables: ${missing.join(", ")}. Copy .env.example to .env and fill in values.`);
        process.exit(1);
    }
    if (process.env.JWT_SECRET.length < 16) {
        console.warn("[env] JWT_SECRET should be at least 16 characters for production.");
    }
    if (!isSet(process.env.GEMINI_API_KEY)) {
        console.warn("[env] GEMINI_API_KEY is not set — AI features will fail.");
    }
    if (!isSet(process.env.GOOGLE_CLIENT_ID) || !isSet(process.env.GOOGLE_CLIENT_SECRET)) {
        console.warn("[env] Google OAuth is disabled — set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.");
    }
    if (!isSet(process.env.API_BASE_URL) && process.env.NODE_ENV === "production") {
        console.warn("[env] API_BASE_URL is not set — OAuth callbacks will use http://localhost:PORT. Set API_BASE_URL to your public API URL.");
    }
    const requireVerify = process.env.REQUIRE_EMAIL_VERIFICATION !== "false";
    if (requireVerify && !isSet(process.env.RESEND_API_KEY) && !isSet(process.env.SMTP_USER)) {
        console.warn("[env] Email verification is enabled but SMTP/Resend is not configured.");
    }
}
