import { Router, Request, Response } from "express";
import passport from "passport";
import { auth } from "../middleware/auth";
import { portalBaseUrl } from "../services/verificationTokens";
import {
  login,
  oauthSuccess,
  getMe,
  register,
  verifyEmail,
  resendVerificationEmail,
  forgotPassword,
  resetPassword,
} from "../controllers/authController";

const router = Router();

const oauthFailureRedirect = `${portalBaseUrl()}/login?error=oauth`;

router.post("/register", register);
router.post("/login", login);
router.get("/me", auth, getMe);
router.post("/verify-email", verifyEmail);
router.get("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerificationEmail);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: oauthFailureRedirect,
  }),
  oauthSuccess
);

router.get("/failed", (_req: Request, res: Response) => {
  res.redirect(oauthFailureRedirect);
});

export default router;
