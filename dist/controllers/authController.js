"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = exports.getMe = exports.oauthSuccess = exports.resetPassword = exports.forgotPassword = exports.resendVerificationEmail = exports.verifyEmail = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const emailService_1 = require("../services/emailService");
const verificationTokens_1 = require("../services/verificationTokens");
const resolveAuthOrigin_1 = require("../lib/email/resolveAuthOrigin");
const studentId_1 = require("../utils/studentId");
const VALID_ROLES = ["student", "teacher", "admin"];
const formatUser = (user) => ({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    emailVerified: user.emailVerified,
    studentId: user.studentId ?? undefined,
    timezone: user.timezone ?? "Asia/Dhaka",
    country: user.country ?? undefined,
    avatarUrl: user.avatarUrl || undefined,
    gender: user.gender,
    createdAt: user.createdAt,
});
const signToken = (userId) => {
    return jsonwebtoken_1.default.sign({ id: userId }, process.env.JWT_SECRET, {
        expiresIn: "7d",
    });
};
function mustVerifyEmail(user) {
    if (!(0, emailService_1.isEmailVerificationEnforced)())
        return false;
    return user.emailVerified === false;
}
async function assignVerificationToken(user) {
    const raw = (0, verificationTokens_1.generateRawToken)();
    user.emailVerificationToken = (0, verificationTokens_1.hashToken)(raw);
    user.emailVerificationExpiry = (0, verificationTokens_1.verificationExpiry)();
    user.emailVerified = false;
    await user.save();
    return raw;
}
async function sendUserVerificationEmail(user, rawToken, baseUrl) {
    const verifyUrl = `${baseUrl}/verify-email?token=${rawToken}`;
    await (0, emailService_1.sendVerificationEmail)(user.email, user.name, verifyUrl);
}
const register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        if (!name || !email || !password) {
            res.status(400).json({
                success: false,
                message: "Please provide name, email, and password",
                data: null,
            });
            return;
        }
        if (!process.env.JWT_SECRET) {
            res.status(500).json({
                success: false,
                message: "JWT_SECRET is not configured",
                data: null,
            });
            return;
        }
        if (role && role !== "student") {
            res.status(400).json({
                success: false,
                message: "Public registration is for student accounts only",
                data: null,
            });
            return;
        }
        if (role && !VALID_ROLES.includes(role)) {
            res.status(400).json({
                success: false,
                message: "Invalid role",
                data: null,
            });
            return;
        }
        const existingUser = await User_1.User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            res.status(400).json({
                success: false,
                message: "Email already exists",
                data: null,
            });
            return;
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const assignRole = "student";
        const skipVerification = !(0, emailService_1.isEmailVerificationEnforced)() || assignRole !== "student";
        const studentId = await (0, studentId_1.generateStudentId)();
        const user = await User_1.User.create({
            name,
            email,
            password: hashedPassword,
            role: assignRole,
            authProvider: "local",
            emailVerified: skipVerification,
            studentId,
            timezone: "Asia/Dhaka",
        });
        if (!skipVerification) {
            const raw = await assignVerificationToken(user);
            const authBase = (0, resolveAuthOrigin_1.resolveAuthBaseUrl)(req, "portal");
            await sendUserVerificationEmail(user, raw, authBase);
            res.status(201).json({
                success: true,
                message: "Please check your email to verify your account",
                data: {
                    requiresVerification: true,
                    email: user.email,
                },
            });
            return;
        }
        const token = signToken(user._id.toString());
        res.status(201).json({
            success: true,
            message: "User registered successfully",
            data: {
                token,
                user: formatUser(user),
            },
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Registration failed",
            data: null,
        });
    }
};
exports.register = register;
const verifyEmail = async (req, res) => {
    try {
        const token = (typeof req.body?.token === "string" ? req.body.token : null) ||
            (typeof req.query.token === "string" ? req.query.token : null);
        if (!token) {
            res.status(400).json({
                success: false,
                message: "Verification token is required",
                data: null,
            });
            return;
        }
        if (!process.env.JWT_SECRET) {
            res.status(500).json({
                success: false,
                message: "JWT_SECRET is not configured",
                data: null,
            });
            return;
        }
        const hashed = (0, verificationTokens_1.hashToken)(token);
        const user = await User_1.User.findOne({
            emailVerificationToken: hashed,
            emailVerificationExpiry: { $gt: new Date() },
        });
        if (!user) {
            res.status(400).json({
                success: false,
                message: "Invalid or expired verification link",
                data: null,
            });
            return;
        }
        if (!user.isActive) {
            res.status(401).json({
                success: false,
                message: "Account is deactivated",
                data: null,
            });
            return;
        }
        user.emailVerified = true;
        user.emailVerificationToken = null;
        user.emailVerificationExpiry = null;
        await user.save();
        const jwtToken = signToken(user._id.toString());
        res.status(200).json({
            success: true,
            message: "Email verified successfully",
            data: {
                token: jwtToken,
                user: formatUser(user),
            },
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Email verification failed",
            data: null,
        });
    }
};
exports.verifyEmail = verifyEmail;
const resendVerificationEmail = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            res.status(400).json({
                success: false,
                message: "Please provide email",
                data: null,
            });
            return;
        }
        const user = await User_1.User.findOne({ email: email.toLowerCase() });
        if (user && user.isActive && user.emailVerified === false) {
            const raw = await assignVerificationToken(user);
            const authBase = (0, resolveAuthOrigin_1.resolveAuthBaseUrl)(req, "portal");
            await sendUserVerificationEmail(user, raw, authBase);
        }
        res.status(200).json({
            success: true,
            message: "If an unverified account exists for this email, a new verification link has been sent",
            data: null,
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to resend verification email",
            data: null,
        });
    }
};
exports.resendVerificationEmail = resendVerificationEmail;
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email || typeof email !== "string") {
            res.status(400).json({
                success: false,
                message: "Please provide email",
                data: null,
            });
            return;
        }
        const normalizedEmail = email.trim().toLowerCase();
        const authBase = (0, resolveAuthOrigin_1.resolveAuthBaseUrl)(req, "portal");
        const loginUrl = `${authBase}/login`;
        const registerUrl = `${authBase}/register`;
        const supportEmail = process.env.SUPPORT_EMAIL?.trim() || "bdonlinequranacademy@gmail.com";
        const user = await User_1.User.findOne({
            email: normalizedEmail,
            isActive: true,
        });
        let mail;
        if (user?.authProvider === "local") {
            const raw = (0, verificationTokens_1.generateRawToken)();
            user.passwordResetToken = (0, verificationTokens_1.hashToken)(raw);
            user.passwordResetExpiry = (0, verificationTokens_1.resetExpiry)();
            await user.save();
            const resetUrl = `${authBase}/reset-password?token=${raw}`;
            mail = await (0, emailService_1.sendPasswordResetEmail)(user.email, user.name, resetUrl);
        }
        else if (user) {
            mail = await (0, emailService_1.sendPasswordResetGoogleHintEmail)(normalizedEmail, user.name, loginUrl);
        }
        else {
            mail = await (0, emailService_1.sendPasswordResetNoAccountEmail)(normalizedEmail, registerUrl, supportEmail);
        }
        if (!mail.sent) {
            console.error(`[auth] Password reset email NOT sent to ${normalizedEmail}: ${mail.error ?? "unknown"}`);
        }
        res.status(200).json({
            success: true,
            message: "Password reset instructions have been sent to your email.",
            data: null,
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to process password reset request",
            data: null,
        });
    }
};
exports.forgotPassword = forgotPassword;
const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            res.status(400).json({
                success: false,
                message: "Please provide token and newPassword",
                data: null,
            });
            return;
        }
        if (typeof newPassword !== "string" || newPassword.length < 6) {
            res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters",
                data: null,
            });
            return;
        }
        const hashed = (0, verificationTokens_1.hashToken)(token);
        const user = await User_1.User.findOne({
            passwordResetToken: hashed,
            passwordResetExpiry: { $gt: new Date() },
            isActive: true,
        });
        if (!user) {
            res.status(400).json({
                success: false,
                message: "Invalid or expired reset link",
                data: null,
            });
            return;
        }
        user.password = await bcryptjs_1.default.hash(newPassword, 10);
        user.passwordResetToken = null;
        user.passwordResetExpiry = null;
        await user.save();
        res.status(200).json({
            success: true,
            message: "Password reset successfully. You can now sign in.",
            data: null,
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to reset password",
            data: null,
        });
    }
};
exports.resetPassword = resetPassword;
const oauthSuccess = (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            res.redirect(`${(0, resolveAuthOrigin_1.getPortalBaseUrl)()}/login?error=oauth`);
            return;
        }
        if (!user.isActive) {
            res.redirect(`${(0, resolveAuthOrigin_1.getPortalBaseUrl)()}/login?error=deactivated`);
            return;
        }
        if (!process.env.JWT_SECRET) {
            res.redirect(`${(0, resolveAuthOrigin_1.getPortalBaseUrl)()}/login?error=oauth`);
            return;
        }
        const token = signToken(user._id.toString());
        const callbackUrl = new URL("/auth/callback", (0, resolveAuthOrigin_1.getPortalBaseUrl)());
        callbackUrl.hash = `token=${encodeURIComponent(token)}`;
        res.redirect(callbackUrl.toString());
    }
    catch {
        res.redirect(`${(0, resolveAuthOrigin_1.getPortalBaseUrl)()}/login?error=oauth`);
    }
};
exports.oauthSuccess = oauthSuccess;
const getMe = (req, res) => {
    const user = req.user;
    if (!user) {
        res.status(401).json({
            success: false,
            message: "Unauthorized",
            data: null,
        });
        return;
    }
    res.status(200).json({
        success: true,
        message: "OK",
        data: formatUser(user),
    });
};
exports.getMe = getMe;
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({
                success: false,
                message: "Please provide email and password",
                data: null,
            });
            return;
        }
        if (!process.env.JWT_SECRET) {
            res.status(500).json({
                success: false,
                message: "JWT_SECRET is not configured",
                data: null,
            });
            return;
        }
        const user = await User_1.User.findOne({ email: email.toLowerCase() });
        if (!user) {
            res.status(401).json({
                success: false,
                message: "Invalid email or password",
                data: null,
            });
            return;
        }
        if (!user.isActive) {
            res.status(401).json({
                success: false,
                message: "Account is deactivated",
                data: null,
            });
            return;
        }
        if (mustVerifyEmail(user)) {
            res.status(403).json({
                success: false,
                message: "Email not verified. Please check your inbox or resend the link.",
                data: { emailVerified: false, email: user.email },
            });
            return;
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.password);
        if (!isMatch) {
            res.status(401).json({
                success: false,
                message: "Invalid email or password",
                data: null,
            });
            return;
        }
        const token = signToken(user._id.toString());
        res.status(200).json({
            success: true,
            message: "Login successful",
            data: {
                token,
                user: formatUser(user),
            },
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Login failed",
            data: null,
        });
    }
};
exports.login = login;
