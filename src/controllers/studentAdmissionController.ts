import { Request, Response } from "express";
import mongoose from "mongoose";
import type { StudentAdmissionStatus } from "../models/StudentAdmissionApplication";
import { uploadApplicationFile } from "../services/cloudinaryUploadService";
import {
  createStudentAdmissionApplication,
  listStudentAdmissionApplications,
  updateStudentAdmissionStatus,
} from "../services/studentAdmissionService";

function parseLocale(value: unknown): "en" | "bn" | undefined {
  if (value === "en" || value === "bn") return value;
  return undefined;
}

function parseStatus(value: unknown): StudentAdmissionStatus | undefined {
  if (
    value === "new" ||
    value === "reviewing" ||
    value === "approved" ||
    value === "closed"
  ) {
    return value;
  }
  return undefined;
}

function parseFormData(raw: unknown): Record<string, unknown> | null {
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }

  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }

  return null;
}

export const submitStudentAdmission = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const file = req.file;
    const body = parseFormData(req.body.data ?? req.body) ?? {};

    const fullName =
      typeof body.fullName === "string"
        ? body.fullName
        : typeof body.name === "string"
          ? body.name
          : "";

    let proofUpload: { url: string; publicId: string } | undefined;

    if (file) {
      try {
        proofUpload = await uploadApplicationFile(
          file.buffer,
          "student-admissions/payment-proofs",
          file.mimetype || "image/jpeg",
          "image"
        );
      } catch (uploadErr) {
        const message =
          uploadErr instanceof Error &&
          uploadErr.message === "CLOUDINARY_NOT_CONFIGURED"
            ? "File upload is not configured on the server"
            : "Failed to upload payment proof";
        res.status(503).json({ success: false, message, data: null });
        return;
      }
    }

    const formData: Record<string, unknown> = {
      ...body,
      ...(proofUpload
        ? {
            admissionPaymentProofUrl: proofUpload.url,
            admissionPaymentProofPublicId: proofUpload.publicId,
          }
        : {}),
    };

    delete formData.admissionPaymentProofFile;

    const result = await createStudentAdmissionApplication({
      fullName,
      email: typeof body.email === "string" ? body.email : "",
      whatsapp: typeof body.whatsapp === "string" ? body.whatsapp : "",
      formData,
      locale: parseLocale(body.locale),
    });

    if ("error" in result) {
      res.status(400).json({ success: false, message: result.error, data: null });
      return;
    }

    const { application } = result;

    res.status(201).json({
      success: true,
      message:
        "Admission application received. We will verify your payment and contact you within 24–48 hours.",
      data: { id: application._id, status: application.status },
    });
  } catch (err) {
    console.error("[admission] submit failed:", err);
    res.status(500).json({
      success: false,
      message: "Failed to submit admission application",
      data: null,
    });
  }
};

export const listAdminStudentAdmissions = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const status = parseStatus(req.query.status);
    if (req.query.status && !status) {
      res.status(400).json({
        success: false,
        message: "Invalid status filter",
        data: null,
      });
      return;
    }

    const data = await listStudentAdmissionApplications(status);
    res.status(200).json({
      success: true,
      message: "Student admission applications fetched",
      data,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch admission applications",
      data: null,
    });
  }
};

export const patchAdminStudentAdmissionStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const status = parseStatus(req.body.status);
    const adminNote =
      typeof req.body.adminNote === "string" ? req.body.adminNote : undefined;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid application ID",
        data: null,
      });
      return;
    }

    if (!status) {
      res.status(400).json({
        success: false,
        message: "status must be new, reviewing, approved, or closed",
        data: null,
      });
      return;
    }

    const result = await updateStudentAdmissionStatus(id, status, adminNote);

    if ("error" in result) {
      res.status(404).json({ success: false, message: result.error, data: null });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Admission application updated",
      data: result.application,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to update admission application",
      data: null,
    });
  }
};
