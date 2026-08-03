"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isEmailConfigured = isEmailConfigured;
exports.isSmtpConfigured = isSmtpConfigured;
exports.isEmailVerificationEnforced = isEmailVerificationEnforced;
exports.emailSetupHint = emailSetupHint;
exports.verifyEmailConnection = verifyEmailConnection;
exports.verifySmtpConnection = verifySmtpConnection;
exports.sendEmail = sendEmail;
exports.sendVerificationEmail = sendVerificationEmail;
exports.sendPasswordResetEmail = sendPasswordResetEmail;
exports.sendPasswordResetGoogleHintEmail = sendPasswordResetGoogleHintEmail;
exports.sendPasswordResetNoAccountEmail = sendPasswordResetNoAccountEmail;
const emailConfig_1 = require("../lib/email/emailConfig");
const brandEmailTemplate_1 = require("../lib/email/brandEmailTemplate");
const resendClient_1 = require("../lib/email/resendClient");
function shouldLogEmailToConsole() {
    return (process.env.NODE_ENV !== "production" ||
        process.env.SMTP_DEV_LOG === "true");
}
function logEmailToConsole(reason, options) {
    console.log(`\n--- Email (${reason}) ---`);
    console.log(`To: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log(options.text);
    console.log("---\n");
}
function logSendFailure(err, from) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.warn(`[email] Send failed: ${msg}`);
    if (/domain is not verified|not authorized|403|422/i.test(msg)) {
        console.warn(`[email] Resend rejected "${from}". Verify bdonlinequranacademy.com at https://resend.com/domains`);
    }
}
function isEmailConfigured() {
    return (0, resendClient_1.isResendConfigured)();
}
/** @deprecated Prefer isEmailConfigured — kept for scripts */
function isSmtpConfigured() {
    return isEmailConfigured();
}
function isEmailVerificationEnforced() {
    return process.env.REQUIRE_EMAIL_VERIFICATION !== "false";
}
function emailSetupHint() {
    return [
        "Resend SDK email setup:",
        "RESEND_API_KEY=re_... (from https://resend.com/api-keys)",
        "FROM_EMAIL=no-reply@bdonlinequranacademy.com (domain must be verified on Resend)",
        "CLIENT_URL=https://admin.bdonlinequranacademy.com",
        "PUBLIC_SITE_URL=https://www.bdonlinequranacademy.com",
    ].join("\n");
}
/** Call on server start to verify Resend readiness. */
async function verifyEmailConnection() {
    if (!(0, resendClient_1.isResendConfigured)()) {
        console.warn("[email] RESEND_API_KEY not configured — auth links will print to the console in development.\n" +
            emailSetupHint());
        return false;
    }
    console.log(`[email] Resend SDK ready (from: ${(0, emailConfig_1.resolveFromAddress)()})`);
    return true;
}
/** @deprecated Use verifyEmailConnection */
async function verifySmtpConnection() {
    return verifyEmailConnection();
}
async function sendEmail(options) {
    const client = (0, resendClient_1.getResendClient)();
    const from = (0, emailConfig_1.resolveFromAddress)();
    const logInDev = shouldLogEmailToConsole();
    if (!client) {
        const msg = "RESEND_API_KEY is not configured";
        console.error(`[email] ${msg}`);
        if (logInDev) {
            logEmailToConsole("Resend not configured", options);
        }
        return { sent: false, devLogged: logInDev, error: msg };
    }
    try {
        const { error } = await client.emails.send({
            from,
            to: options.to,
            subject: options.subject,
            text: options.text,
            html: options.html,
        });
        if (error) {
            throw new Error(error.message);
        }
        return { sent: true, devLogged: false };
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        logSendFailure(err, from);
        console.error(`[email] Failed to send to ${options.to}: ${msg}`);
        if (logInDev) {
            logEmailToConsole("Resend send failed — dev fallback", options);
        }
        return { sent: false, devLogged: logInDev, error: msg };
    }
}
async function sendVerificationEmail(email, name, verificationLink) {
    const content = {
        title: "Verify your email address",
        greeting: `Assalamu alaikum ${name},`,
        messageBody: `Welcome to ${emailConfig_1.EMAIL_BRAND.name}. Please confirm your email address to activate your account and access your learning portal.\n\nThis link expires in 24 hours.`,
        buttonText: "Verify my email",
        buttonLink: verificationLink,
        preheader: "Confirm your BDOQ Academy account",
    };
    await sendEmail({
        to: email,
        subject: `Verify your ${emailConfig_1.EMAIL_BRAND.name} account`,
        text: (0, brandEmailTemplate_1.buildBrandEmailText)(content),
        html: (0, brandEmailTemplate_1.buildBrandEmailHtml)(content),
    });
}
async function sendPasswordResetEmail(email, name, resetLink) {
    const content = {
        title: "Reset your password",
        greeting: `Assalamu alaikum ${name},`,
        messageBody: `We received a request to reset your ${emailConfig_1.EMAIL_BRAND.name} password. Click the button below to choose a new password.\n\nThis link expires in 1 hour. If you did not request a reset, you can safely ignore this email.`,
        buttonText: "Reset my password",
        buttonLink: resetLink,
        preheader: "Password reset request for BDOQ Academy",
    };
    const result = await sendEmail({
        to: email,
        subject: `Reset your ${emailConfig_1.EMAIL_BRAND.name} password`,
        text: (0, brandEmailTemplate_1.buildBrandEmailText)(content),
        html: (0, brandEmailTemplate_1.buildBrandEmailHtml)(content),
    });
    return { sent: result.sent, error: result.error };
}
async function sendPasswordResetGoogleHintEmail(email, name, loginUrl) {
    const content = {
        title: "Sign in with Google",
        greeting: `Assalamu alaikum ${name},`,
        messageBody: `You requested a password reset for ${email}, but this account uses Google sign-in.\n\nPlease open the login page and tap "Sign in with Google" — no password is needed for this account.`,
        buttonText: "Go to login",
        buttonLink: loginUrl,
        preheader: "Use Google sign-in for your BDOQ Academy account",
    };
    const result = await sendEmail({
        to: email,
        subject: `How to sign in — ${emailConfig_1.EMAIL_BRAND.name}`,
        text: (0, brandEmailTemplate_1.buildBrandEmailText)(content),
        html: (0, brandEmailTemplate_1.buildBrandEmailHtml)(content),
    });
    return { sent: result.sent, error: result.error };
}
async function sendPasswordResetNoAccountEmail(email, registerUrl, supportEmail) {
    const content = {
        title: "Password reset request",
        greeting: "Assalamu alaikum,",
        messageBody: `We received a password reset request for ${email}, but we could not find an active account with this email address.\n\nIf you are new, you can register for a student account. If you believe this is a mistake, reply to this email or contact us at ${supportEmail}.`,
        buttonText: "Create an account",
        buttonLink: registerUrl,
        preheader: "BDOQ Academy password reset",
    };
    const result = await sendEmail({
        to: email,
        subject: `Password reset — ${emailConfig_1.EMAIL_BRAND.name}`,
        text: (0, brandEmailTemplate_1.buildBrandEmailText)(content),
        html: (0, brandEmailTemplate_1.buildBrandEmailHtml)(content),
    });
    return { sent: result.sent, error: result.error };
}
