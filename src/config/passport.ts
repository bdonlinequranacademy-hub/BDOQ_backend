import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { IUser, User, AuthProvider } from "../models/User";

const getCallbackBase = (): string => {
  const port = process.env.PORT || "5000";
  return process.env.API_BASE_URL || `http://localhost:${port}`;
};

const isConfigured = (value: string | undefined): boolean =>
  Boolean(value && value.trim() && !value.toLowerCase().includes("comming"));

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

if (isConfigured(process.env.GOOGLE_CLIENT_ID) && isConfigured(process.env.GOOGLE_CLIENT_SECRET)) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID as string,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        callbackURL: `${getCallbackBase()}/api/auth/google/callback`,
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

if (isConfigured(process.env.FACEBOOK_APP_ID) && isConfigured(process.env.FACEBOOK_APP_SECRET)) {
  passport.use(
    new FacebookStrategy(
      {
        clientID: process.env.FACEBOOK_APP_ID as string,
        clientSecret: process.env.FACEBOOK_APP_SECRET as string,
        callbackURL: `${getCallbackBase()}/api/auth/facebook/callback`,
        profileFields: ["id", "emails", "name"],
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(null, false);
          }

          const givenName = profile.name?.givenName ?? "";
          const familyName = profile.name?.familyName ?? "";
          const name =
            `${givenName} ${familyName}`.trim() || profile.displayName || email;

          const user = await findOrCreateOAuthUser(
            email,
            name,
            "facebook",
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
  console.warn("Facebook OAuth disabled: set FACEBOOK_APP_ID and FACEBOOK_APP_SECRET in .env");
}

export default passport;
