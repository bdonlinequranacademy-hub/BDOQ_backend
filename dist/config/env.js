"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEnv = validateEnv;
const oauth_1 = require("./oauth");
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
    if (!(0, oauth_1.isGoogleOAuthConfigured)()) {
        console.warn("[env] Google OAuth is disabled — set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env. See docs/google-oauth-setup.md");
    }
    if (!isSet(process.env.CLOUDINARY_CLOUD_NAME)) {
        console.warn("[env] CLOUDINARY_* is not set — payment screenshot upload will fail.");
    }
    if (!isSet(process.env.API_BASE_URL) && process.env.NODE_ENV === "production") {
        console.warn("[env] API_BASE_URL is not set — OAuth callbacks will use http://localhost:PORT. Set API_BASE_URL to your public API URL.");
    }
    if (process.env.NODE_ENV === "production") {
        if (!isSet(process.env.RESEND_API_KEY)) {
            console.error("[env] RESEND_API_KEY is missing in production — password reset and verification emails will NOT be sent.");
        }
        const from = process.env.FROM_EMAIL?.trim() ?? "";
        if (from && !from.endsWith("@bdonlinequranacademy.com")) {
            console.warn(`[env] FROM_EMAIL="${from}" should be no-reply@bdonlinequranacademy.com for Resend (verified domain).`);
        }
    }
    const requireVerify = process.env.REQUIRE_EMAIL_VERIFICATION !== "false";
    if (requireVerify && !isSet(process.env.RESEND_API_KEY)) {
        console.warn("[env] Email verification is enabled but RESEND_API_KEY is not configured.");
    }
}
