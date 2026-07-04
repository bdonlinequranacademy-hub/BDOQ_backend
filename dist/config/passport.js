"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const passport_1 = __importDefault(require("passport"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const User_1 = require("../models/User");
const oauth_1 = require("../config/oauth");
const findOrCreateOAuthUser = async (email, name, provider, providerId) => {
    const normalizedEmail = email.toLowerCase();
    let user = await User_1.User.findOne({ email: normalizedEmail });
    if (user) {
        if (!user.isActive) {
            throw new Error("Account is deactivated");
        }
        if (!user.emailVerified) {
            user.emailVerified = true;
            user.emailVerificationToken = null;
            user.emailVerificationExpiry = null;
            await user.save();
        }
        return user;
    }
    const randomPassword = crypto_1.default.randomBytes(32).toString("hex");
    const hashedPassword = await bcryptjs_1.default.hash(randomPassword, 10);
    user = await User_1.User.create({
        name,
        email: normalizedEmail,
        password: hashedPassword,
        role: "student",
        isActive: true,
        authProvider: provider,
        providerId: providerId ?? null,
        emailVerified: true,
    });
    return user;
};
if ((0, oauth_1.isGoogleOAuthConfigured)()) {
    passport_1.default.use(new passport_google_oauth20_1.Strategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: (0, oauth_1.getGoogleOAuthCallbackUrl)(),
        scope: ["profile", "email"],
    }, async (_accessToken, _refreshToken, profile, done) => {
        try {
            const email = profile.emails?.[0]?.value;
            if (!email) {
                return done(null, false);
            }
            const name = profile.displayName || email;
            const user = await findOrCreateOAuthUser(email, name, "google", profile.id);
            return done(null, user);
        }
        catch (error) {
            return done(error);
        }
    }));
}
else {
    console.warn("Google OAuth disabled: set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env");
}
exports.default = passport_1.default;
