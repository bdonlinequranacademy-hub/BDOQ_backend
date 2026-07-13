import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { User } from "../models/User";
import { avatarFieldsFromUser } from "../lib/avatarFields";

export interface AdminProfileView {
  _id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl: string;
  gender?: "male" | "female";
  authProvider: string;
  isActive: boolean;
  createdAt?: string;
}

function toProfileView(user: InstanceType<typeof User>): AdminProfileView {
  return {
    _id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    ...avatarFieldsFromUser(user),
    gender: user.gender,
    authProvider: user.authProvider ?? "local",
    isActive: user.isActive !== false,
    createdAt: user.createdAt
      ? new Date(user.createdAt).toISOString()
      : undefined,
  };
}

const PROFILE_SELECT =
  "name email role avatarUrl gender authProvider isActive createdAt";

export const getAdminProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = await User.findById(req.user!._id).select(PROFILE_SELECT);
    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
        data: null,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Profile fetched successfully",
      data: toProfileView(user),
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch profile",
      data: null,
    });
  }
};

export const updateAdminProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { name, gender } = req.body;

    const update: Record<string, string> = {};
    if (typeof name === "string" && name.trim()) {
      update.name = name.trim();
    }
    if (gender === "male" || gender === "female") {
      update.gender = gender;
    }
    if (gender === "" || gender === null) {
      // allow clearing — use $unset via separate path; skip for simplicity
    }

    if (Object.keys(update).length === 0) {
      res.status(400).json({
        success: false,
        message: "Nothing to update",
        data: null,
      });
      return;
    }

    const user = await User.findByIdAndUpdate(req.user!._id, update, {
      new: true,
      runValidators: true,
    }).select(PROFILE_SELECT);

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
        data: null,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: toProfileView(user),
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to update profile",
      data: null,
    });
  }
};

export const changeAdminPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword || String(newPassword).length < 6) {
      res.status(400).json({
        success: false,
        message: "Current password and new password (min 6 chars) are required",
        data: null,
      });
      return;
    }

    const user = await User.findById(req.user!._id);
    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
        data: null,
      });
      return;
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        message: "Current password is incorrect",
        data: null,
      });
      return;
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
      data: null,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to change password",
      data: null,
    });
  }
};
