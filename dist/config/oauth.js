"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isGoogleOAuthConfigured = isGoogleOAuthConfigured;
exports.getOAuthCallbackBase = getOAuthCallbackBase;
exports.getGoogleOAuthCallbackUrl = getGoogleOAuthCallbackUrl;
function isConfigured(value) {
    return Boolean(value?.trim() && !value.toLowerCase().includes("comming"));
}
function isGoogleOAuthConfigured() {
    return (isConfigured(process.env.GOOGLE_CLIENT_ID) &&
        isConfigured(process.env.GOOGLE_CLIENT_SECRET));
}
/** Public API base — used for OAuth callback URLs (no trailing slash). */
function getOAuthCallbackBase() {
    const port = process.env.PORT || "5000";
    return (process.env.API_BASE_URL || `http://localhost:${port}`).replace(/\/$/, "");
}
function getGoogleOAuthCallbackUrl() {
    return `${getOAuthCallbackBase()}/api/auth/google/callback`;
}
