import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { User } from "../models/User";
import { normalizeWhatsAppForStorage } from "../lib/whatsappPhone";
import { avatarFieldsFromUser } from "../lib/avatarFields";
import type { ScheduleDay } from "../models/Class";
import { checkTeacherAvailability } from "../services/availabilityService";

export interface TeacherProfileView {
  _id: string;
  name: string;
  email: string;
  role: string;
  timezone: string;
  country: string;
  meetingLink: string;
  bankName: string;
  bankAccount: string;
  bKashNumber: string;
  whatsapp: string;
  avatarUrl: string;
  gender?: "male" | "female";
}

function toProfileView(user: InstanceType<typeof User>): TeacherProfileView {
  return {
    _id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    timezone: user.timezone || "Asia/Dhaka",
    country: user.country || "",
    meetingLink: user.meetingLink || "",
    bankName: user.bankName || "",
    bankAccount: user.bankAccount || "",
    bKashNumber: user.bKashNumber || "",
    whatsapp: user.whatsapp || "",
    ...avatarFieldsFromUser(user),
    gender: user.gender,
  };
}

export const getTeacherProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const user = await User.findById(req.user!._id).select(
      "name email role timezone country meetingLink bankName bankAccount bKashNumber whatsapp avatarUrl gender"
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

export const updateTeacherProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      name,
      timezone,
      country,
      meetingLink,
      bankName,
      bankAccount,
      bKashNumber,
      whatsapp,
    } = req.body;

    const update: Record<string, string> = {};
    if (typeof name === "string" && name.trim()) update.name = name.trim();
    if (typeof timezone === "string" && timezone.trim()) {
      update.timezone = timezone.trim();
    }
    if (typeof country === "string") update.country = country.trim();
    if (typeof meetingLink === "string") update.meetingLink = meetingLink.trim();
    if (typeof bankName === "string") update.bankName = bankName.trim();
    if (typeof bankAccount === "string") update.bankAccount = bankAccount.trim();
    if (typeof bKashNumber === "string") update.bKashNumber = bKashNumber.trim();
    if (whatsapp !== undefined) {
      const countryHint =
        typeof country === "string" ? country.trim() : req.user?.country;
      const normalized = normalizeWhatsAppForStorage(whatsapp, countryHint);
      if (!normalized.ok) {
        res.status(400).json({
          success: false,
          message: normalized.error,
          data: null,
        });
        return;
      }
      update.whatsapp = normalized.whatsapp;
    }

    const user = await User.findByIdAndUpdate(req.user!._id, update, {
      new: true,
      runValidators: true,
    }).select(
      "name email role timezone country meetingLink bankName bankAccount bKashNumber whatsapp avatarUrl gender"
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

export const changeTeacherPassword = async (
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

export const checkAvailability = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { day, startTime, durationMinutes } = req.body;

    if (!day || !startTime) {
      res.status(400).json({
        success: false,
        message: "day and startTime are required",
        data: null,
      });
      return;
    }

    const duration =
      typeof durationMinutes === "number" ? durationMinutes : Number(durationMinutes) || 60;

    const result = await checkTeacherAvailability(
      req.user!._id,
      day as ScheduleDay,
      String(startTime),
      duration
    );

    res.status(200).json({
      success: true,
      message: result.available ? "You are free at this time" : "Time slot conflicts",
      data: result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message === "INVALID_DAY" || message === "INVALID_TIME") {
      res.status(400).json({
        success: false,
        message: "Invalid day or time",
        data: null,
      });
      return;
    }
    res.status(500).json({
      success: false,
      message: "Failed to check availability",
      data: null,
    });
  }
};
