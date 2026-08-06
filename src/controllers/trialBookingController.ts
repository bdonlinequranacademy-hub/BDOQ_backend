import { Request, Response } from "express";
import mongoose from "mongoose";
import type { TrialBookingStatus } from "../models/TrialBooking";
import {
  createTrialBooking,
  listTrialBookings,
  updateTrialBooking,
  updateTrialBookingStatus,
  deleteTrialBooking,
  sendTrialInvitation,
} from "../services/trialBookingService";
import { convertTrialToAdmission } from "../services/trialConversionService";
import { parseTrialMeetingPlatform } from "../lib/trialMeetingPlatform";

function parseLearnerType(value: unknown): "child" | "teen" | "adult" | undefined {
  if (value === "child" || value === "teen" || value === "adult") return value;
  return undefined;
}

function parseTimeSlot(
  value: unknown
):
  | "anytime"
  | "early_morning"
  | "morning"
  | "afternoon"
  | "evening"
  | "late_evening"
  | undefined {
  const slots = [
    "anytime",
    "early_morning",
    "morning",
    "afternoon",
    "evening",
    "late_evening",
  ] as const;
  if (typeof value === "string" && slots.includes(value as (typeof slots)[number])) {
    return value as (typeof slots)[number];
  }
  return undefined;
}

function parseTeacherPreference(value: unknown): "any" | "female" | "male" | undefined {
  if (value === "any" || value === "female" || value === "male") return value;
  return undefined;
}

function parseBookingStatus(value: unknown): TrialBookingStatus | undefined {
  if (value === "new" || value === "contacted" || value === "scheduled" || value === "closed") {
    return value;
  }
  return undefined;
}

function parseLearnerGender(value: unknown): "male" | "female" | undefined {
  if (value === "male" || value === "female") return value;
  return undefined;
}

export const submitTrialBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    const learnerType = parseLearnerType(req.body.learnerType);
    if (!learnerType) {
      res.status(400).json({
        success: false,
        message: "learnerType is required (child, teen, or adult)",
        data: null,
      });
      return;
    }

    const preferredDays = Array.isArray(req.body.preferredDays)
      ? req.body.preferredDays.filter((d: unknown) => typeof d === "string")
      : [];

    const result = await createTrialBooking({
      parentName: req.body.parentName,
      studentName: req.body.studentName,
      email: req.body.email,
      whatsapp: req.body.whatsapp,
      country: req.body.country,
      age: typeof req.body.age === "string" ? req.body.age : undefined,
      learnerGender: parseLearnerGender(req.body.learnerGender),
      learnerType,
      preferredTrialDate:
        typeof req.body.preferredTrialDate === "string"
          ? req.body.preferredTrialDate
          : undefined,
      preferredTrialTime:
        typeof req.body.preferredTrialTime === "string"
          ? req.body.preferredTrialTime
          : undefined,
      additionalNote:
        typeof req.body.additionalNote === "string" ? req.body.additionalNote : undefined,
      timeSlot: parseTimeSlot(req.body.timeSlot),
      teacherPreference: parseTeacherPreference(req.body.teacherPreference),
      preferredDays,
      timezone: typeof req.body.timezone === "string" ? req.body.timezone : undefined,
      source: req.body.source,
      courseSlug: req.body.courseSlug,
      teacherSlug: req.body.teacherSlug,
      utmSource: req.body.utmSource,
      utmMedium: req.body.utmMedium,
      utmCampaign: req.body.utmCampaign,
      utmContent: req.body.utmContent,
    });

    if ("error" in result) {
      res.status(400).json({ success: false, message: result.error, data: null });
      return;
    }

    const { booking } = result;

    res.status(201).json({
      success: true,
      message: "Trial booking received. We'll contact you within 24 hours.",
      data: { id: booking._id, status: booking.status },
    });
  } catch (err) {
    console.error("[trial] submit failed:", err);
    res.status(500).json({
      success: false,
      message: "Failed to submit trial booking",
      data: null,
    });
  }
};

export const listAdminTrialBookings = async (req: Request, res: Response): Promise<void> => {
  try {
    const status = parseBookingStatus(req.query.status);
    if (req.query.status && !status) {
      res.status(400).json({
        success: false,
        message: "Invalid status filter",
        data: null,
      });
      return;
    }

    const data = await listTrialBookings(status);
    res.status(200).json({
      success: true,
      message: "Trial bookings fetched",
      data,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch trial bookings",
      data: null,
    });
  }
};

export const patchAdminTrialBookingStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const status = parseBookingStatus(req.body.status);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid booking ID",
        data: null,
      });
      return;
    }

    if (!status) {
      res.status(400).json({
        success: false,
        message: "status must be new, contacted, scheduled, or closed",
        data: null,
      });
      return;
    }

    const result = await updateTrialBookingStatus(id, status);

    if ("error" in result) {
      res.status(404).json({ success: false, message: result.error, data: null });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Trial booking updated",
      data: result.booking,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to update trial booking",
      data: null,
    });
  }
};

export const patchAdminTrialBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid booking ID",
        data: null,
      });
      return;
    }

    const preferredDays = Array.isArray(req.body.preferredDays)
      ? req.body.preferredDays.filter((d: unknown) => typeof d === "string")
      : undefined;

    const result = await updateTrialBooking(id, {
      parentName: typeof req.body.parentName === "string" ? req.body.parentName : undefined,
      studentName: typeof req.body.studentName === "string" ? req.body.studentName : undefined,
      email: typeof req.body.email === "string" ? req.body.email : undefined,
      whatsapp: typeof req.body.whatsapp === "string" ? req.body.whatsapp : undefined,
      country: typeof req.body.country === "string" ? req.body.country : undefined,
      age: typeof req.body.age === "string" ? req.body.age : undefined,
      learnerGender: parseLearnerGender(req.body.learnerGender),
      learnerType: parseLearnerType(req.body.learnerType),
      preferredTrialDate:
        typeof req.body.preferredTrialDate === "string"
          ? req.body.preferredTrialDate
          : undefined,
      preferredTrialTime:
        typeof req.body.preferredTrialTime === "string"
          ? req.body.preferredTrialTime
          : undefined,
      additionalNote:
        typeof req.body.additionalNote === "string" ? req.body.additionalNote : undefined,
      timeSlot: parseTimeSlot(req.body.timeSlot),
      teacherPreference: parseTeacherPreference(req.body.teacherPreference),
      preferredDays,
      timezone: typeof req.body.timezone === "string" ? req.body.timezone : undefined,
      courseSlug: typeof req.body.courseSlug === "string" ? req.body.courseSlug : undefined,
      teacherSlug: typeof req.body.teacherSlug === "string" ? req.body.teacherSlug : undefined,
      meetingPlatform: parseTrialMeetingPlatform(req.body.meetingPlatform),
      meetingLink: typeof req.body.meetingLink === "string" ? req.body.meetingLink : undefined,
      status: parseBookingStatus(req.body.status),
    });

    if ("error" in result) {
      const statusCode = result.error === "Trial booking not found" ? 404 : 400;
      res.status(statusCode).json({ success: false, message: result.error, data: null });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Trial booking updated",
      data: result.booking,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to update trial booking",
      data: null,
    });
  }
};

export const postAdminSendTrialInvitation = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid booking ID",
        data: null,
      });
      return;
    }

    const result = await sendTrialInvitation(id, {
      teacherSlug: typeof req.body.teacherSlug === "string" ? req.body.teacherSlug : undefined,
      meetingPlatform: parseTrialMeetingPlatform(req.body.meetingPlatform),
      meetingLink: typeof req.body.meetingLink === "string" ? req.body.meetingLink : undefined,
    });

    if ("error" in result) {
      const statusCode = result.error === "Trial booking not found" ? 404 : 400;
      res.status(statusCode).json({ success: false, message: result.error, data: null });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Trial invitation prepared",
      data: result,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to send trial invitation",
      data: null,
    });
  }
};

export const postAdminConvertTrialToAdmission = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid booking ID",
        data: null,
      });
      return;
    }

    const result = await convertTrialToAdmission(id, {
      email: typeof req.body.email === "string" ? req.body.email : "",
      createUser: req.body.createUser !== false,
      locale: req.body.locale === "bn" ? "bn" : req.body.locale === "en" ? "en" : undefined,
    });

    if ("error" in result) {
      const statusCode = result.error === "Trial booking not found" ? 404 : 400;
      res.status(statusCode).json({ success: false, message: result.error, data: null });
      return;
    }

    res.status(201).json({
      success: true,
      message: "Trial lead converted to admission",
      data: result,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to convert trial lead",
      data: null,
    });
  }
};

export const deleteAdminTrialBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid booking ID",
        data: null,
      });
      return;
    }

    const result = await deleteTrialBooking(id);

    if ("error" in result) {
      res.status(404).json({ success: false, message: result.error, data: null });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Trial booking deleted",
      data: null,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to delete trial booking",
      data: null,
    });
  }
};
