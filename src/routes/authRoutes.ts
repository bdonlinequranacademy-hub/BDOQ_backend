import { Router, Request, Response, NextFunction } from "express";
import passport from "passport";
import { auth } from "../middleware/auth";
import { portalBaseUrl } from "../services/verificationTokens";
import {
  parsePortalIntent,
  OAuthAccountRequiredError,
  OAuthPortalMismatchError,
} from "../lib/portalAuth";
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

function oauthFailureRedirect(portal: string, error: string): string {
  return `${portalBaseUrl()}/login?portal=${encodeURIComponent(portal)}&error=${encodeURIComponent(error)}`;
}

router.post("/register", register);
router.post("/login", login);
router.get("/me", auth, getMe);
router.post("/verify-email", verifyEmail);
router.get("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerificationEmail);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

router.get("/google", (req: Request, res: Response, next: NextFunction) => {
  const portal = parsePortalIntent(req.query.portal);
  passport.authenticate("google", {
    scope: ["profile", "email"],
    state: portal,
  })(req, res, next);
});

router.get(
  "/google/callback",
  (req: Request, res: Response, next: NextFunction) => {
    const portal = parsePortalIntent(req.query.state);

    passport.authenticate("google", { session: false }, (err, user) => {
      if (err instanceof OAuthPortalMismatchError) {
        res.redirect(oauthFailureRedirect(portal, "oauth_role"));
        return;
      }
      if (err instanceof OAuthAccountRequiredError) {
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
  },
  oauthSuccess
);

router.get("/failed", (req: Request, res: Response) => {
  const portal = parsePortalIntent(req.query.portal);
  res.redirect(oauthFailureRedirect(portal, "oauth"));
});

export default router;
