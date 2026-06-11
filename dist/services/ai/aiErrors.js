"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiQuotaError = void 0;
exports.isQuotaError = isQuotaError;
exports.toGeminiError = toGeminiError;
exports.aiErrorStatus = aiErrorStatus;
exports.aiErrorMessage = aiErrorMessage;
class GeminiQuotaError extends Error {
    constructor(message = "Daily AI limit reached. Please try again later.") {
        super(message);
        this.name = "GeminiQuotaError";
    }
}
exports.GeminiQuotaError = GeminiQuotaError;
function isQuotaError(message) {
    const lower = message.toLowerCase();
    return (lower.includes("429") ||
        lower.includes("resource_exhausted") ||
        lower.includes("quota") ||
        lower.includes("rate limit"));
}
function toGeminiError(error) {
    const message = error instanceof Error ? error.message : String(error);
    if (isQuotaError(message)) {
        return new GeminiQuotaError();
    }
    return error instanceof Error ? error : new Error(message);
}
function aiErrorStatus(error) {
    return error instanceof GeminiQuotaError ? 429 : 500;
}
function aiErrorMessage(error, fallback) {
    if (error instanceof GeminiQuotaError) {
        return error.message;
    }
    return fallback;
}
