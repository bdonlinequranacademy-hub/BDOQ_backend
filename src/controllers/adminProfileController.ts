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
}

function toProfileView(user: InstanceType<typeof User>): AdminProfileView {
  return {
    _id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    ...avatarFieldsFromUser(user),
    gender: user.gender,
  };
}

export const getAdminProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = await User.findById(req.user!._id).select("name email role avatarUrl gender");
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
    const { name } = req.body;

    const update: Record<string, string> = {};
    if (typeof name === "string" && name.trim()) {
      update.name = name.trim();
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
    }).select("name email role avatarUrl gender");

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
