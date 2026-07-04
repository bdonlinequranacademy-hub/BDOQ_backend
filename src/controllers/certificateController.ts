import { Request, Response } from "express";
import mongoose from "mongoose";
import { IUser } from "../models/User";
import { Certificate } from "../models/Certificate";
import {
  buildVerifyUrl,
  formatCertificate,
  generateCertificateId,
  shouldShowExcellentBadge,
  DEFAULT_PERFORMANCE_BN,
  DEFAULT_PERFORMANCE_EN,
} from "../services/certificateService";

function parseIssueDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export const listAdminCertificates = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const docs = await Certificate.find()
      .sort({ createdAt: -1 })
      .limit(100);
    res.status(200).json({
      success: true,
      message: "Certificates fetched",
      data: docs.map(formatCertificate),
    });
  } catch (err) {
    console.error("[certificate] list failed:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch certificates",
      data: null,
    });
  }
};

export const getAdminCertificate = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid certificate ID",
        data: null,
      });
      return;
    }
    const doc = await Certificate.findById(id);
    if (!doc) {
      res.status(404).json({
        success: false,
        message: "Certificate not found",
        data: null,
      });
      return;
    }
    res.status(200).json({
      success: true,
      message: "Certificate fetched",
      data: formatCertificate(doc),
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch certificate",
      data: null,
    });
  }
};

export const createAdminCertificate = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const admin = req.user as IUser;
    const {
      studentName,
      studentNameBn,
      courseName,
      courseNameBn,
      studentPortalId,
      issueDate,
      courseDuration,
      grade,
      showExcellentBadge,
      performanceTextEn,
      performanceTextBn,
    } = req.body;

    if (!studentName || typeof studentName !== "string" || !studentName.trim()) {
      res.status(400).json({
        success: false,
        message: "Student name is required",
        data: null,
      });
      return;
    }

    if (!courseName || typeof courseName !== "string" || !courseName.trim()) {
      res.status(400).json({
        success: false,
        message: "Course name is required",
        data: null,
      });
      return;
    }

    if (!courseDuration || typeof courseDuration !== "string") {
      res.status(400).json({
        success: false,
        message: "Course duration is required",
        data: null,
      });
      return;
    }

    if (!grade || typeof grade !== "string") {
      res.status(400).json({
        success: false,
        message: "Grade is required",
        data: null,
      });
      return;
    }

    const parsedDate = parseIssueDate(issueDate) ?? new Date();
    const gradeStr = grade.trim();
    const badge =
      typeof showExcellentBadge === "boolean"
        ? showExcellentBadge
        : shouldShowExcellentBadge(gradeStr);

    const certificateId = await generateCertificateId();

    const doc = await Certificate.create({
      certificateId,
      studentName: studentName.trim(),
      studentNameBn:
        typeof studentNameBn === "string" ? studentNameBn.trim() : "",
      courseName: courseName.trim(),
      courseNameBn:
        typeof courseNameBn === "string" ? courseNameBn.trim() : "",
      studentPortalId:
        typeof studentPortalId === "string" ? studentPortalId.trim() : "",
      issueDate: parsedDate,
      courseDuration: courseDuration.trim(),
      grade: gradeStr,
      showExcellentBadge: badge,
      performanceTextEn:
        typeof performanceTextEn === "string" && performanceTextEn.trim()
          ? performanceTextEn.trim()
          : DEFAULT_PERFORMANCE_EN,
      performanceTextBn:
        typeof performanceTextBn === "string" && performanceTextBn.trim()
          ? performanceTextBn.trim()
          : DEFAULT_PERFORMANCE_BN,
      issuedBy: admin._id,
    });

    res.status(201).json({
      success: true,
      message: "Certificate created",
      data: formatCertificate(doc),
    });
  } catch (err) {
    console.error("[certificate] create failed:", err);
    res.status(500).json({
      success: false,
      message: "Failed to create certificate",
      data: null,
    });
  }
};

export const previewAdminCertificate = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const admin = req.user as IUser;
    const {
      studentName,
      studentNameBn,
      courseName,
      courseNameBn,
      studentPortalId,
      issueDate,
      courseDuration,
      grade,
      showExcellentBadge,
      performanceTextEn,
      performanceTextBn,
      certificateId,
    } = req.body;

    if (!studentName?.trim() || !courseName?.trim()) {
      res.status(400).json({
        success: false,
        message: "Student name and course name are required for preview",
        data: null,
      });
      return;
    }

    const gradeStr = String(grade || "Excellent (A+)").trim();
    const certId =
      typeof certificateId === "string" && certificateId.trim()
        ? certificateId.trim().toUpperCase()
        : `BDOQ-${new Date().getFullYear()}-PREVIEW`;

    const parsedDate = parseIssueDate(issueDate) ?? new Date();
    const badge =
      typeof showExcellentBadge === "boolean"
        ? showExcellentBadge
        : shouldShowExcellentBadge(gradeStr);

    const preview = formatCertificate({
      _id: new mongoose.Types.ObjectId(),
      certificateId: certId,
      studentName: studentName.trim(),
      studentNameBn: typeof studentNameBn === "string" ? studentNameBn.trim() : "",
      courseName: courseName.trim(),
      courseNameBn: typeof courseNameBn === "string" ? courseNameBn.trim() : "",
      studentPortalId:
        typeof studentPortalId === "string" ? studentPortalId.trim() : "",
      issueDate: parsedDate,
      courseDuration: String(courseDuration || "3 Months").trim(),
      grade: gradeStr,
      showExcellentBadge: badge,
      performanceTextEn:
        typeof performanceTextEn === "string" && performanceTextEn.trim()
          ? performanceTextEn.trim()
          : DEFAULT_PERFORMANCE_EN,
      performanceTextBn:
        typeof performanceTextBn === "string" && performanceTextBn.trim()
          ? performanceTextBn.trim()
          : DEFAULT_PERFORMANCE_BN,
      issuedBy: admin._id,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as InstanceType<typeof Certificate>);

    res.status(200).json({
      success: true,
      message: "Preview generated",
      data: preview,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to generate preview",
      data: null,
    });
  }
};

export const verifyPublicCertificate = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const rawId = req.params.certificateId;
    if (!rawId?.trim()) {
      res.status(400).json({
        success: false,
        message: "Certificate ID is required",
        data: null,
      });
      return;
    }

    const certificateId = decodeURIComponent(rawId).trim().toUpperCase();
    const doc = await Certificate.findOne({ certificateId });

    if (!doc) {
      res.status(404).json({
        success: false,
        message: "Certificate not found or invalid",
        data: null,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Certificate verified",
      data: {
        valid: true,
        ...formatCertificate(doc),
      },
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Verification failed",
      data: null,
    });
  }
};
