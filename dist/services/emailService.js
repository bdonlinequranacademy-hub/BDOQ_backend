"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSmtpConfigured = isSmtpConfigured;
exports.isEmailVerificationEnforced = isEmailVerificationEnforced;
exports.verifySmtpConnection = verifySmtpConnection;
exports.sendEmail = sendEmail;
exports.sendVerificationEmail = sendVerificationEmail;
exports.sendPasswordResetEmail = sendPasswordResetEmail;
const nodemailer_1 = __importDefault(require("nodemailer"));
const smtp_1 = require("../config/smtp");
const ACADEMY_NAME = "BD Online Quran Academy";
let cachedTransporter;
function getTransporter() {
    if (cachedTransporter !== undefined) {
        return cachedTransporter;
    }
    const config = (0, smtp_1.resolveSmtpConfig)();
    if (!config) {
        cachedTransporter = null;
        return null;
    }
    cachedTransporter = nodemailer_1.default.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
            user: config.user,
            pass: config.pass,
        },
    });
    return cachedTransporter;
}
function isSmtpConfigured() {
    return getTransporter() !== null;
}
function isEmailVerificationEnforced() {
    return process.env.REQUIRE_EMAIL_VERIFICATION !== "false";
}
/** Call on server start to log SMTP readiness. */
async function verifySmtpConnection() {
    const transporter = getTransporter();
    if (!transporter) {
        console.warn("[email] SMTP not configured — verification links will print to the console in development.\n" +
            (0, smtp_1.smtpSetupHint)());
        return false;
    }
    try {
        await transporter.verify();
        const config = (0, smtp_1.resolveSmtpConfig)();
        console.log(`[email] SMTP ready (${config?.provider} → ${config?.host}:${config?.port})`);
        return true;
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        const hasKey = Boolean(process.env.RESEND_API_KEY?.trim() || process.env.SMTP_PASS?.trim());
        if (hasKey && /535|invalid|unauthorized|401/i.test(msg)) {
            console.warn("[email] Resend/SMTP key rejected — emails disabled. Create a new API key at https://resend.com/api-keys, then npm run test-email. Dev: links still print to console.");
        }
        else {
            console.warn(`[email] SMTP connection failed: ${msg}`);
            console.warn((0, smtp_1.smtpSetupHint)());
        }
        return false;
    }
}
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
    if (/domain is not verified|550/i.test(msg)) {
        console.warn(`[email] Resend rejected "${from}". Verify the domain at https://resend.com/domains ` +
            "or set FROM_EMAIL=onboarding@resend.dev for testing.");
    }
}
async function sendEmail(options) {
    const config = (0, smtp_1.resolveSmtpConfig)();
    const transporter = getTransporter();
    const logInDev = shouldLogEmailToConsole();
    if (!transporter || !config) {
        if (logInDev) {
            logEmailToConsole("SMTP not configured", options);
        }
        return { sent: false, devLogged: logInDev };
    }
    try {
        await transporter.sendMail({
            from: `${ACADEMY_NAME} <${config.from}>`,
            to: options.to,
            subject: options.subject,
            text: options.text,
            html: options.html,
        });
        return { sent: true, devLogged: false };
    }
    catch (err) {
        logSendFailure(err, config.from);
        if (logInDev) {
            logEmailToConsole("SMTP send failed — dev fallback", options);
        }
        return { sent: false, devLogged: logInDev };
    }
}
async function sendVerificationEmail(email, name, verifyUrl) {
    await sendEmail({
        to: email,
        subject: `Verify your ${ACADEMY_NAME} account`,
        text: `Hi ${name},\n\nPlease verify your email by opening this link:\n${verifyUrl}\n\nThis link expires in 24 hours.\n\n— ${ACADEMY_NAME}`,
        html: `
      <p>Hi ${name},</p>
      <p>Please verify your email to access your learning portal:</p>
      <p><a href="${verifyUrl}" style="color:#03214F;font-weight:bold">Verify my email</a></p>
      <p>Or copy this link: ${verifyUrl}</p>
      <p>This link expires in 24 hours.</p>
      <p>— ${ACADEMY_NAME}</p>
    `,
    });
}
async function sendPasswordResetEmail(email, name, resetUrl) {
    await sendEmail({
        to: email,
        subject: `Reset your ${ACADEMY_NAME} password`,
        text: `Hi ${name},\n\nReset your password:\n${resetUrl}\n\nThis link expires in 1 hour. If you did not request this, ignore this email.\n\n— ${ACADEMY_NAME}`,
        html: `
      <p>Hi ${name},</p>
      <p><a href="${resetUrl}" style="color:#03214F;font-weight:bold">Reset my password</a></p>
      <p>Or copy: ${resetUrl}</p>
      <p>Expires in 1 hour.</p>
      <p>— ${ACADEMY_NAME}</p>
    `,
    });
}
