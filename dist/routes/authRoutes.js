"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const passport_1 = __importDefault(require("passport"));
const auth_1 = require("../middleware/auth");
const verificationTokens_1 = require("../services/verificationTokens");
const authController_1 = require("../controllers/authController");
const router = (0, express_1.Router)();
const oauthFailureRedirect = `${(0, verificationTokens_1.portalBaseUrl)()}/login?error=oauth`;
router.post("/register", authController_1.register);
router.post("/login", authController_1.login);
router.get("/me", auth_1.auth, authController_1.getMe);
router.post("/verify-email", authController_1.verifyEmail);
router.get("/verify-email", authController_1.verifyEmail);
router.post("/resend-verification", authController_1.resendVerificationEmail);
router.post("/forgot-password", authController_1.forgotPassword);
router.post("/reset-password", authController_1.resetPassword);
router.get("/google", passport_1.default.authenticate("google", { scope: ["profile", "email"] }));
router.get("/google/callback", passport_1.default.authenticate("google", {
    session: false,
    failureRedirect: oauthFailureRedirect,
}), authController_1.oauthSuccess);
router.get("/failed", (_req, res) => {
    res.redirect(oauthFailureRedirect);
});
exports.default = router;
