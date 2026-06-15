"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const passport_1 = __importDefault(require("passport"));
const auth_1 = require("../middleware/auth");
const verificationTokens_1 = require("../services/verificationTokens");
const portalAuth_1 = require("../lib/portalAuth");
const authController_1 = require("../controllers/authController");
const router = (0, express_1.Router)();
function oauthFailureRedirect(portal, error) {
    return `${(0, verificationTokens_1.portalBaseUrl)()}/login?portal=${encodeURIComponent(portal)}&error=${encodeURIComponent(error)}`;
}
router.post("/register", authController_1.register);
router.post("/login", authController_1.login);
router.get("/me", auth_1.auth, authController_1.getMe);
router.post("/verify-email", authController_1.verifyEmail);
router.get("/verify-email", authController_1.verifyEmail);
router.post("/resend-verification", authController_1.resendVerificationEmail);
router.post("/forgot-password", authController_1.forgotPassword);
router.post("/reset-password", authController_1.resetPassword);
router.get("/google", (req, res, next) => {
    const portal = (0, portalAuth_1.parsePortalIntent)(req.query.portal);
    passport_1.default.authenticate("google", {
        scope: ["profile", "email"],
        state: portal,
    })(req, res, next);
});
router.get("/google/callback", (req, res, next) => {
    const portal = (0, portalAuth_1.parsePortalIntent)(req.query.state);
    passport_1.default.authenticate("google", { session: false }, (err, user) => {
        if (err instanceof portalAuth_1.OAuthPortalMismatchError) {
            res.redirect(oauthFailureRedirect(portal, "oauth_role"));
            return;
        }
        if (err instanceof portalAuth_1.OAuthAccountRequiredError) {
            res.redirect(oauthFailureRedirect(portal, "oauth_account_required"));
            return;
        }
        if (err?.message === "Account is deactivated") {
            res.redirect(oauthFailureRedirect(portal, "deactivated"));
            return;
        }
        if (err || !user) {
            res.redirect(oauthFailureRedirect(portal, "oauth"));
            return;
        }
        req.user = user;
        next();
    })(req, res, next);
}, authController_1.oauthSuccess);
router.get("/failed", (req, res) => {
    const portal = (0, portalAuth_1.parsePortalIntent)(req.query.portal);
    res.redirect(oauthFailureRedirect(portal, "oauth"));
});
exports.default = router;
