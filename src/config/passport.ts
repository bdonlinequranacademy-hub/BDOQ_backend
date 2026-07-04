import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { IUser, User, AuthProvider } from "../models/User";
import { getGoogleOAuthCallbackUrl, isGoogleOAuthConfigured } from "../config/oauth";

const findOrCreateOAuthUser = async (
  email: string,
  name: string,
  provider: AuthProvider,
  providerId?: string
): Promise<IUser> => {
  const normalizedEmail = email.toLowerCase();
  let user = await User.findOne({ email: normalizedEmail });

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

  const randomPassword = crypto.randomBytes(32).toString("hex");
  const hashedPassword = await bcrypt.hash(randomPassword, 10);

  user = await User.create({
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

if (isGoogleOAuthConfigured()) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID as string,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        callbackURL: getGoogleOAuthCallbackUrl(),
        scope: ["profile", "email"],
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(null, false);
          }

          const name = profile.displayName || email;
          const user = await findOrCreateOAuthUser(
            email,
            name,
            "google",
            profile.id
          );
          return done(null, user);
        } catch (error) {
          return done(error as Error);
        }
      }
    )
  );
} else {
  console.warn("Google OAuth disabled: set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env");
}

export default passport;
