import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { IUser, User, UserRole, AuthProvider } from "../models/User";
import {
  isEmailVerificationEnforced,
  sendVerificationEmail,
  sendPasswordResetEmail,
} from "../services/emailService";
import {
  generateRawToken,
  hashToken,
  verificationExpiry,
  resetExpiry,
  portalBaseUrl,
} from "../services/verificationTokens";
import { generateStudentId } from "../utils/studentId";

const VALID_ROLES: UserRole[] = ["student", "teacher", "admin", "parent"];

const formatUser = (user: IUser) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role === "parent" ? "student" : user.role,
  isActive: user.isActive,
  emailVerified: user.emailVerified,
  studentId: user.studentId ?? undefined,
  timezone: user.timezone ?? "Asia/Dhaka",
  country: user.country ?? undefined,
  createdAt: user.createdAt,
});

const signToken = (userId: string): string => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET as string, {
    expiresIn: "7d",
  });
};

function mustVerifyEmail(user: IUser): boolean {
  if (!isEmailVerificationEnforced()) return false;
  return user.emailVerified === false;
}

async function assignVerificationToken(user: IUser): Promise<string> {
  const raw = generateRawToken();
  user.emailVerificationToken = hashToken(raw);
  user.emailVerificationExpiry = verificationExpiry();
  user.emailVerified = false;
  await user.save();
  return raw;
}

async function sendUserVerificationEmail(user: IUser, rawToken: string) {
  const verifyUrl = `${portalBaseUrl()}/verify-email?token=${rawToken}`;
  await sendVerificationEmail(user.email, user.name, verifyUrl);
}

export const register = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({
        success: false,
        message: "Please provide name, email, and password",
        data: null,
      });
      return;
    }

    if (!process.env.JWT_SECRET) {
      res.status(500).json({
        success: false,
        message: "JWT_SECRET is not configured",
        data: null,
      });
      return;
    }

    if (role && role !== "student") {
      res.status(400).json({
        success: false,
        message: "Public registration is for student accounts only",
        data: null,
      });
      return;
    }

    if (role && !VALID_ROLES.includes(role)) {
      res.status(400).json({
        success: false,
        message: "Invalid role",
        data: null,
      });
      return;
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
      res.status(400).json({
        success: false,
        message: "Email already exists",
        data: null,
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const assignRole = "student";
    const skipVerification =
      !isEmailVerificationEnforced() || assignRole !== "student";
    const studentId = await generateStudentId();

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: assignRole,
      authProvider: "local",
      emailVerified: skipVerification,
      studentId,
      timezone: "Asia/Dhaka",
    });

    if (!skipVerification) {
      const raw = await assignVerificationToken(user);
      await sendUserVerificationEmail(user, raw);

      res.status(201).json({
        success: true,
        message: "Please check your email to verify your account",
        data: {
          requiresVerification: true,
          email: user.email,
        },
      });
      return;
    }

    const token = signToken(user._id.toString());

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        token,
        user: formatUser(user),
      },
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Registration failed",
      data: null,
    });
  }
};

export const verifyEmail = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const token =
      (typeof req.body?.token === "string" ? req.body.token : null) ||
      (typeof req.query.token === "string" ? req.query.token : null);

    if (!token) {
      res.status(400).json({
        success: false,
        message: "Verification token is required",
        data: null,
      });
      return;
    }

    if (!process.env.JWT_SECRET) {
      res.status(500).json({
        success: false,
        message: "JWT_SECRET is not configured",
        data: null,
      });
      return;
    }

    const hashed = hashToken(token);
    const user = await User.findOne({
      emailVerificationToken: hashed,
      emailVerificationExpiry: { $gt: new Date() },
    });

    if (!user) {
      res.status(400).json({
        success: false,
        message: "Invalid or expired verification link",
        data: null,
      });
      return;
    }

    if (!user.isActive) {
      res.status(401).json({
        success: false,
        message: "Account is deactivated",
        data: null,
      });
      return;
    }

    user.emailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpiry = null;
    await user.save();

    const jwtToken = signToken(user._id.toString());

    res.status(200).json({
      success: true,
      message: "Email verified successfully",
      data: {
        token: jwtToken,
        user: formatUser(user),
      },
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Email verification failed",
      data: null,
    });
  }
};

export const resendVerificationEmail = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        message: "Please provide email",
        data: null,
      });
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (user && user.isActive && user.emailVerified === false) {
      const raw = await assignVerificationToken(user);
      await sendUserVerificationEmail(user, raw);
    }

    res.status(200).json({
      success: true,
      message:
        "If an unverified account exists for this email, a new verification link has been sent",
      data: null,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to resend verification email",
      data: null,
    });
  }
};

export const forgotPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        message: "Please provide email",
        data: null,
      });
      return;
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
      isActive: true,
      authProvider: "local",
    });

    if (user) {
      const raw = generateRawToken();
      user.passwordResetToken = hashToken(raw);
      user.passwordResetExpiry = resetExpiry();
      await user.save();

      const resetUrl = `${portalBaseUrl()}/reset-password?token=${raw}`;
      await sendPasswordResetEmail(user.email, user.name, resetUrl);
    }

    res.status(200).json({
      success: true,
      message:
        "If an account exists for this email, password reset instructions have been sent",
      data: null,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to process password reset request",
      data: null,
    });
  }
};

export const resetPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      res.status(400).json({
        success: false,
        message: "Please provide token and newPassword",
        data: null,
      });
      return;
    }

    if (typeof newPassword !== "string" || newPassword.length < 6) {
      res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
        data: null,
      });
      return;
    }

    const hashed = hashToken(token);
    const user = await User.findOne({
      passwordResetToken: hashed,
      passwordResetExpiry: { $gt: new Date() },
      isActive: true,
    });

    if (!user) {
      res.status(400).json({
        success: false,
        message: "Invalid or expired reset link",
        data: null,
      });
      return;
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.passwordResetToken = null;
    user.passwordResetExpiry = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password reset successfully. You can now sign in.",
      data: null,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to reset password",
      data: null,
    });
  }
};

export const oauthSuccess = (req: Request, res: Response): void => {
  try {
    const user = req.user as IUser | undefined;

    if (!user) {
      res.redirect(`${portalBaseUrl()}/login?error=oauth`);
      return;
    }

    if (!user.isActive) {
      res.redirect(`${portalBaseUrl()}/login?error=deactivated`);
      return;
    }

    if (!process.env.JWT_SECRET) {
      res.redirect(`${portalBaseUrl()}/login?error=oauth`);
      return;
    }

    const token = signToken(user._id.toString());
    const callbackUrl = new URL("/auth/callback", portalBaseUrl());
    callbackUrl.hash = `token=${encodeURIComponent(token)}`;
    res.redirect(callbackUrl.toString());
  } catch {
    res.redirect(`${portalBaseUrl()}/login?error=oauth`);
  }
};

export const getMe = (req: Request, res: Response): void => {
  const user = req.user as IUser | undefined;

  if (!user) {
    res.status(401).json({
      success: false,
      message: "Unauthorized",
      data: null,
    });
    return;
  }

  res.status(200).json({
    success: true,
    message: "OK",
    data: formatUser(user),
  });
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: "Please provide email and password",
        data: null,
      });
      return;
    }

    if (!process.env.JWT_SECRET) {
      res.status(500).json({
        success: false,
        message: "JWT_SECRET is not configured",
        data: null,
      });
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password",
        data: null,
      });
      return;
    }

    if (!user.isActive) {
      res.status(401).json({
        success: false,
        message: "Account is deactivated",
        data: null,
      });
      return;
    }

    if (mustVerifyEmail(user)) {
      res.status(403).json({
        success: false,
        message: "Email not verified. Please check your inbox or resend the link.",
        data: { emailVerified: false, email: user.email },
      });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password",
        data: null,
      });
      return;
    }

    const token = signToken(user._id.toString());

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        token,
        user: formatUser(user),
      },
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Login failed",
      data: null,
    });
  }
};
