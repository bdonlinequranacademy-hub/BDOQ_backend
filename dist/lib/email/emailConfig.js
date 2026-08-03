"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EMAIL_BRAND = void 0;
exports.resolveFromAddress = resolveFromAddress;
exports.EMAIL_BRAND = {
    name: "BDOQ Academy",
    legalName: "BD Online Quran Academy",
    primaryColor: "#32C991",
    primaryDark: "#269B6F",
    accentGold: "#D4A853",
    textDark: "#1A1A2E",
    textMuted: "#6B7280",
    background: "#F0FBF6",
    logoUrl: process.env.EMAIL_LOGO_URL?.trim() ||
        "https://www.bdonlinequranacademy.com/images/brand/bdoq-logo.png",
    websiteUrl: "https://www.bdonlinequranacademy.com",
};
function resolveFromAddress() {
    const from = process.env.FROM_EMAIL?.trim() ||
        process.env.EMAIL_FROM?.trim() ||
        "no-reply@bdonlinequranacademy.com";
    return `${exports.EMAIL_BRAND.name} <${from}>`;
}
