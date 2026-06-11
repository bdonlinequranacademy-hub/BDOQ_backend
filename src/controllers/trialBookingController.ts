import { Request, Response } from "express";
import mongoose from "mongoose";
import type { TrialBookingStatus } from "../models/TrialBooking";
import {
  createTrialBooking,
  listTrialBookings,
  updateTrialBookingStatus,
} from "../services/trialBookingService";

function parseLearnerType(value: unknown): "child" | "teen" | "adult" | undefined {
  if (value === "child" || value === "teen" || value === "adult") return value;
  return undefined;
}

function parseTimeSlot(value: unknown): "morning" | "afternoon" | "evening" | undefined {
  if (value === "morning" || value === "afternoon" || value === "evening") return value;
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
      email: req.body.email,
      whatsapp: req.body.whatsapp,
      learnerType,
      timeSlot: parseTimeSlot(req.body.timeSlot),
      teacherPreference: parseTeacherPreference(req.body.teacherPreference),
      preferredDays,
      timezone: req.body.timezone,
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
