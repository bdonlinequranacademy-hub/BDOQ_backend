import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { IUser, User, UserRole } from "../models/User";

const VALID_ROLES: UserRole[] = ["student", "teacher", "admin", "parent"];

const formatUser = (user: IUser) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  isActive: user.isActive,
  createdAt: user.createdAt,
});

const signToken = (userId: string): string => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET as string, {
    expiresIn: "7d",
  });
};

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

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || "student",
    });

    const token = signToken(user._id.toString());

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        token,
        user: formatUser(user),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Registration failed",
      data: null,
    });
  }
};

export const oauthSuccess = (req: Request, res: Response): void => {
  try {
    const user = req.user as IUser | undefined;

    if (!user) {
      res.status(401).json({
        success: false,
        message: "OAuth login failed",
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

    const token = signToken(user._id.toString());

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        token,
        user: {
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "OAuth login failed",
      data: null,
    });
  }
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
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Login failed",
      data: null,
    });
  }
};
