"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getResendClient = getResendClient;
exports.isResendConfigured = isResendConfigured;
const resend_1 = require("resend");
let cachedClient;
function getResendClient() {
    if (cachedClient !== undefined) {
        return cachedClient;
    }
    const apiKey = process.env.RESEND_API_KEY?.trim();
    if (!apiKey) {
        cachedClient = null;
        return null;
    }
    cachedClient = new resend_1.Resend(apiKey);
    return cachedClient;
}
function isResendConfigured() {
    return getResendClient() !== null;
}
