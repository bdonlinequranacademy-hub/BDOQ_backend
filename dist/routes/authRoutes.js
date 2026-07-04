"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const passport_1 = __importDefault(require("passport"));
const auth_1 = require("../middleware/auth");
const verificationTokens_1 = require("../services/verificationTokens");
const oauth_1 = require("../config/oauth");
const authController_1 = require("../controllers/authController");
const router = (0, express_1.Router)();
function oauthFailureRedirect(error) {
    return `${(0, verificationTokens_1.portalBaseUrl)()}/login?error=${encodeURIComponent(error)}`;
}
router.post("/register", authController_1.register);
router.post("/login", authController_1.login);
router.get("/me", auth_1.auth, authController_1.getMe);
router.post("/verify-email", authController_1.verifyEmail);
router.get("/verify-email", authController_1.verifyEmail);
router.post("/resend-verification", authController_1.resendVerificationEmail);
router.post("/forgot-password", authController_1.forgotPassword);
router.post("/reset-password", authController_1.resetPassword);
router.get("/oauth-providers", (_req, res) => {
    res.json({
        success: true,
        message: "OAuth providers",
        data: { google: (0, oauth_1.isGoogleOAuthConfigured)() },
    });
});
router.get("/google", (req, res, next) => {
    if (!(0, oauth_1.isGoogleOAuthConfigured)()) {
        res.redirect(oauthFailureRedirect("oauth_disabled"));
        return;
    }
    passport_1.default.authenticate("google", {
        scope: ["profile", "email"],
    })(req, res, next);
});
router.get("/google/callback", (req, res, next) => {
    if (!(0, oauth_1.isGoogleOAuthConfigured)()) {
        res.redirect(oauthFailureRedirect("oauth_disabled"));
        return;
    }
    passport_1.default.authenticate("google", { session: false }, (err, user) => {
        if (err?.message === "Account is deactivated") {
            res.redirect(oauthFailureRedirect("deactivated"));
            return;
        }
        if (err || !user) {
            res.redirect(oauthFailureRedirect("oauth"));
            return;
        }
        req.user = user;
        next();
    })(req, res, next);
}, authController_1.oauthSuccess);
router.get("/failed", (_req, res) => {
    res.redirect(oauthFailureRedirect("oauth"));
});
exports.default = router;
