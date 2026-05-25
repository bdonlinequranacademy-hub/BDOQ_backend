import { Router, Request, Response } from "express";
import passport from "passport";
import { login, oauthSuccess, register } from "../controllers/authController";

const router = Router();

router.post("/register", register);
router.post("/login", login);

router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/api/auth/failed",
  }),
  oauthSuccess
);

router.get(
  "/facebook",
  passport.authenticate("facebook", { scope: ["email"] })
);

router.get(
  "/facebook/callback",
  passport.authenticate("facebook", {
    session: false,
    failureRedirect: "/api/auth/failed",
  }),
  oauthSuccess
);

router.get("/failed", (_req: Request, res: Response) => {
  res.status(401).json({
    success: false,
    message: "OAuth login failed",
  });
});

export default router;
