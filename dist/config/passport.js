"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const passport_1 = __importDefault(require("passport"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const passport_facebook_1 = require("passport-facebook");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const User_1 = require("../models/User");
const portalAuth_1 = require("../lib/portalAuth");
const getCallbackBase = () => {
    const port = process.env.PORT || "5000";
    return process.env.API_BASE_URL || `http://localhost:${port}`;
};
const isConfigured = (value) => Boolean(value && value.trim() && !value.toLowerCase().includes("comming"));
const findOrCreateOAuthUser = async (email, name, provider, portal, providerId) => {
    const normalizedEmail = email.toLowerCase();
    let user = await User_1.User.findOne({ email: normalizedEmail });
    if (user) {
        if (!user.isActive) {
            throw new Error("Account is deactivated");
        }
        if (!(0, portalAuth_1.roleMatchesPortal)(user.role, portal)) {
            throw new portalAuth_1.OAuthPortalMismatchError(portal, user.role);
        }
        if (!user.emailVerified) {
            user.emailVerified = true;
            user.emailVerificationToken = null;
            user.emailVerificationExpiry = null;
            await user.save();
        }
        return user;
    }
    if (portal !== "student") {
        throw new portalAuth_1.OAuthAccountRequiredError(portal);
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
if (isConfigured(process.env.GOOGLE_CLIENT_ID) && isConfigured(process.env.GOOGLE_CLIENT_SECRET)) {
    passport_1.default.use(new passport_google_oauth20_1.Strategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${getCallbackBase()}/api/auth/google/callback`,
        scope: ["profile", "email"],
        passReqToCallback: true,
    }, async (req, _accessToken, _refreshToken, profile, done) => {
        try {
            const email = profile.emails?.[0]?.value;
            if (!email) {
                return done(null, false);
            }
            const portal = (0, portalAuth_1.parsePortalIntent)(req.query.state);
            const name = profile.displayName || email;
            const user = await findOrCreateOAuthUser(email, name, "google", portal, profile.id);
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
if (isConfigured(process.env.FACEBOOK_APP_ID) && isConfigured(process.env.FACEBOOK_APP_SECRET)) {
    passport_1.default.use(new passport_facebook_1.Strategy({
        clientID: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        callbackURL: `${getCallbackBase()}/api/auth/facebook/callback`,
        profileFields: ["id", "emails", "name"],
        passReqToCallback: true,
    }, async (req, _accessToken, _refreshToken, profile, done) => {
        try {
            const email = profile.emails?.[0]?.value;
            if (!email) {
                return done(null, false);
            }
            const portal = (0, portalAuth_1.parsePortalIntent)(req.query.state);
            const givenName = profile.name?.givenName ?? "";
            const familyName = profile.name?.familyName ?? "";
            const name = `${givenName} ${familyName}`.trim() || profile.displayName || email;
            const user = await findOrCreateOAuthUser(email, name, "facebook", portal, profile.id);
            return done(null, user);
        }
        catch (error) {
            return done(error);
        }
    }));
}
else {
    console.warn("Facebook OAuth disabled: set FACEBOOK_APP_ID and FACEBOOK_APP_SECRET in .env");
}
exports.default = passport_1.default;
