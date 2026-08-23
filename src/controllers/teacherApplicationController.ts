import { Request, Response } from "express";
import mongoose from "mongoose";
import type { TeacherApplicationStatus } from "../models/TeacherApplication";
import { uploadApplicationFile } from "../services/cloudinaryUploadService";
import {
  createTeacherApplication,
  deleteTeacherApplication,
  listTeacherApplications,
  updateTeacherApplicationStatus,
} from "../services/teacherApplicationService";

function parseLocale(value: unknown): "en" | "bn" | undefined {
  if (value === "en" || value === "bn") return value;
  return undefined;
}

function parseStatus(value: unknown): TeacherApplicationStatus | undefined {
  if (
    value === "pending" ||
    value === "reviewing" ||
    value === "approved" ||
    value === "rejected"
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

type MulterFiles = {
  [fieldname: string]: Express.Multer.File[];
};

async function uploadField(
  files: MulterFiles | undefined,
  field: string,
  folder: string
): Promise<{ url: string; publicId: string } | undefined> {
  const file = files?.[field]?.[0];
  if (!file) return undefined;

  const mimeType = file.mimetype || "image/jpeg";

  return uploadApplicationFile(
    file.buffer,
    folder,
    mimeType,
    "image",
    file.originalname
  );
}

export const submitTeacherApplication = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const files = req.files as MulterFiles | undefined;
    const formData = parseFormData(req.body.data ?? req.body);

    if (!formData) {
      res.status(400).json({
        success: false,
        message: "Invalid application data",
        data: null,
      });
      return;
    }

    const fullName =
      typeof formData.fullName === "string" ? formData.fullName : "";
    const email = typeof formData.email === "string" ? formData.email : "";
    const phone =
      typeof formData.phone === "string"
        ? formData.phone
        : typeof formData.whatsapp === "string"
          ? formData.whatsapp
          : "";

    let certificateUpload;
    let cvUpload;
    let profileUpload;
    let screenshotUpload;

    try {
      [certificateUpload, cvUpload, profileUpload, screenshotUpload] =
        await Promise.all([
          uploadField(files, "certificateFile", "teacher-applications/certs"),
          uploadField(files, "cvFile", "teacher-applications/cv"),
          uploadField(files, "profilePhotoFile", "teacher-applications/photos"),
          uploadField(files, "screenshotFile", "teacher-applications/screenshots"),
        ]);
    } catch (uploadErr) {
      const message =
        uploadErr instanceof Error && uploadErr.message === "CLOUDINARY_NOT_CONFIGURED"
          ? "File upload is not configured on the server"
          : "Failed to upload application files";
      res.status(503).json({ success: false, message, data: null });
      return;
    }

    if (!cvUpload || !profileUpload || !certificateUpload) {
      res.status(400).json({
        success: false,
        message: "Certificate, CV, and profile photo are required",
        data: null,
      });
      return;
    }

    const {
      certificateFile: _cert,
      cvFile: _cv,
      profilePhotoFile: _photo,
      screenshotFile: _shot,
      rulesAccepted: _rules,
      confirmPassword: _confirm,
      ...sanitized
    } = formData;

    const result = await createTeacherApplication({
      fullName,
      email,
      phone,
      formData: sanitized,
      locale: parseLocale(req.body.locale ?? formData.locale),
      files: {
        certificateUrl: certificateUpload?.url,
        certificatePublicId: certificateUpload?.publicId,
        cvUrl: cvUpload.url,
        cvPublicId: cvUpload.publicId,
        profilePhotoUrl: profileUpload.url,
        profilePhotoPublicId: profileUpload.publicId,
        screenshotUrl: screenshotUpload?.url,
        screenshotPublicId: screenshotUpload?.publicId,
      },
    });

    if ("error" in result) {
      res.status(400).json({ success: false, message: result.error, data: null });
      return;
    }

    const { application } = result;

    res.status(201).json({
      success: true,
      message: "Teacher application received. We will review and contact you soon.",
      data: { id: application._id, status: application.status },
    });
  } catch (err) {
    console.error("[teacher-app] submit failed:", err);
    res.status(500).json({
      success: false,
      message: "Failed to submit teacher application",
      data: null,
    });
  }
};

export const listAdminTeacherApplications = async (
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

    const data = await listTeacherApplications(status);
    res.status(200).json({
      success: true,
      message: "Teacher applications fetched",
      data,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch teacher applications",
      data: null,
    });
  }
};

export const patchAdminTeacherApplicationStatus = async (
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
        message: "status must be pending, reviewing, approved, or rejected",
        data: null,
      });
      return;
    }

    const result = await updateTeacherApplicationStatus(id, status, adminNote);

    if ("error" in result) {
      const statusCode = result.error === "Application not found" ? 404 : 400;
      res.status(statusCode).json({ success: false, message: result.error, data: null });
      return;
    }

    res.status(200).json({
      success: true,
      message:
        status === "approved"
          ? "Application approved — teacher portal account is active"
          : "Teacher application updated",
      data: result.application,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update teacher application",
      data: null,
    });
  }
};

export const deleteAdminTeacherApplication = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid application ID",
        data: null,
      });
      return;
    }

    const result = await deleteTeacherApplication(id);

    if ("error" in result) {
      res.status(404).json({ success: false, message: result.error, data: null });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Teacher application deleted",
      data: null,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to delete teacher application",
      data: null,
    });
  }
};
