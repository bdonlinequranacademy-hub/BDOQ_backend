import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { User } from "../models/User";

export interface StudentProfileView {
  _id: string;
  name: string;
  email: string;
  role: string;
  studentId?: string;
  timezone: string;
  country: string;
}

function toProfileView(user: InstanceType<typeof User>): StudentProfileView {
  return {
    _id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    studentId: user.studentId ?? undefined,
    timezone: user.timezone || "Asia/Dhaka",
    country: user.country || "",
  };
}

export const getStudentProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = await User.findById(req.user!._id).select(
      "name email role studentId timezone country"
    );
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

export const updateStudentProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { name, timezone, country } = req.body;

    const update: Record<string, string> = {};
    if (typeof name === "string" && name.trim()) update.name = name.trim();
    if (typeof timezone === "string" && timezone.trim()) {
      update.timezone = timezone.trim();
    }
    if (typeof country === "string") update.country = country.trim();

    const user = await User.findByIdAndUpdate(req.user!._id, update, {
      new: true,
      runValidators: true,
    }).select("name email role studentId timezone country");

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

export const changeStudentPassword = async (
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
