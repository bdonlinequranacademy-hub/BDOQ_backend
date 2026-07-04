import { Router, Request, Response, NextFunction } from "express";
import passport from "passport";
import { auth } from "../middleware/auth";
import { portalBaseUrl } from "../services/verificationTokens";
import { isGoogleOAuthConfigured } from "../config/oauth";
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

function oauthFailureRedirect(error: string): string {
  return `${portalBaseUrl()}/login?error=${encodeURIComponent(error)}`;
}

router.post("/register", register);
router.post("/login", login);
router.get("/me", auth, getMe);
router.post("/verify-email", verifyEmail);
router.get("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerificationEmail);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

router.get("/oauth-providers", (_req, res) => {
  res.json({
    success: true,
    message: "OAuth providers",
    data: { google: isGoogleOAuthConfigured() },
  });
});

router.get("/google", (req: Request, res: Response, next: NextFunction) => {
  if (!isGoogleOAuthConfigured()) {
    res.redirect(oauthFailureRedirect("oauth_disabled"));
    return;
  }
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })(req, res, next);
});

router.get(
  "/google/callback",
  (req: Request, res: Response, next: NextFunction) => {
    if (!isGoogleOAuthConfigured()) {
      res.redirect(oauthFailureRedirect("oauth_disabled"));
      return;
    }

    passport.authenticate("google", { session: false }, (err, user) => {
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
  },
  oauthSuccess
);

router.get("/failed", (_req: Request, res: Response) => {
  res.redirect(oauthFailureRedirect("oauth"));
});

export default router;
