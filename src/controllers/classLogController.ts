import { Request, Response } from "express";
import mongoose from "mongoose";
import type { ClassLogStatus } from "../models/ClassLog";
import {
  approveClassLog,
  createClassLog,
  getAdminClassLogs,
  getTeacherClassLogById,
  getTeacherClassLogs,
  getTeacherLogStats,
  rejectClassLog,
} from "../services/classLogService";
import { ClassLog } from "../models/ClassLog";
import {
  assessLogQuality,
  combineScanWarnings,
  scanComplianceText,
} from "../services/complianceScanService";
import { SessionSlot } from "../models/SessionSlot";
import { validateCurriculumForStudent } from "../services/curriculumService";

function parseStatus(value: unknown): ClassLogStatus | undefined {
  if (value === "pending" || value === "approved" || value === "rejected") {
    return value;
  }
  return undefined;
}

export const createTeacherClassLog = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      sessionSlotId,
      sessionDate,
      lessonReport,
      topicsCovered,
      curriculumProgram,
      curriculumUnit,
      curriculumTopic,
    } = req.body;

    if (!sessionSlotId || !lessonReport?.trim() || !curriculumProgram) {
      res.status(400).json({
        success: false,
        message: "sessionSlotId, curriculumProgram, and lessonReport are required",
        data: null,
      });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(sessionSlotId)) {
      res.status(400).json({
        success: false,
        message: "Invalid session slot ID",
        data: null,
      });
      return;
    }

    const date =
      typeof sessionDate === "string" && sessionDate
        ? sessionDate
        : new Date().toISOString().split("T")[0];

    const trimmedReport = String(lessonReport).trim();

    const compliance = scanComplianceText(trimmedReport);
    if (!compliance.passed) {
      res.status(400).json({
        success: false,
        message: compliance.message,
        data: { compliance },
      });
      return;
    }

    const previous = await ClassLog.findOne({
      sessionSlot: sessionSlotId,
      teacher: req.user!._id,
    })
      .sort({ createdAt: -1 })
      .select("lessonReport");

    const quality = assessLogQuality(trimmedReport, {
      previousReport: previous?.lessonReport ?? null,
    });
    if (!quality.passed) {
      res.status(400).json({
        success: false,
        message: quality.message,
        data: { quality },
      });
      return;
    }

    const warnings = combineScanWarnings(compliance, quality);

    const slot = await SessionSlot.findOne({
      _id: sessionSlotId,
      teacher: req.user!._id,
      isActive: true,
    }).select("student");

    if (!slot) {
      res.status(404).json({
        success: false,
        message: "Session slot not found",
        data: null,
      });
      return;
    }

    const curriculumOk = await validateCurriculumForStudent(
      slot.student.toString(),
      curriculumProgram,
      curriculumUnit,
      curriculumTopic
    );
    if (!curriculumOk) {
      res.status(400).json({
        success: false,
        message: "Invalid curriculum selection for this student",
        data: null,
      });
      return;
    }

    const log = await createClassLog({
      teacherId: req.user!._id,
      sessionSlotId,
      sessionDate: date,
      lessonReport: trimmedReport,
      topicsCovered: Array.isArray(topicsCovered) ? topicsCovered : undefined,
      curriculumProgram,
      curriculumUnit,
      curriculumTopic,
    });

    res.status(201).json({
      success: true,
      message: "Class log submitted for approval",
      data: log,
      warnings: warnings.length > 0 ? warnings : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message === "SESSION_SLOT_NOT_FOUND") {
      res.status(404).json({
        success: false,
        message: "Session slot not found",
        data: null,
      });
      return;
    }
    if (message === "LOG_ALREADY_EXISTS") {
      res.status(409).json({
        success: false,
        message: "A log for this session on this date already exists",
        data: null,
      });
      return;
    }
    res.status(500).json({
      success: false,
      message: "Failed to create class log",
      data: null,
    });
  }
};

export const listTeacherClassLogs = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const status = parseStatus(req.query.status);
    const logs = await getTeacherClassLogs(req.user!._id, status);

    res.status(200).json({
      success: true,
      message: "Class logs fetched successfully",
      data: logs,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch class logs",
      data: null,
    });
  }
};

export const getTeacherClassLog = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid class log ID",
        data: null,
      });
      return;
    }

    const log = await getTeacherClassLogById(req.user!._id, id);
    if (!log) {
      res.status(404).json({
        success: false,
        message: "Class log not found",
        data: null,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Class log fetched successfully",
      data: log,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch class log",
      data: null,
    });
  }
};

export const getTeacherClassLogStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const stats = await getTeacherLogStats(req.user!._id);
    res.status(200).json({
      success: true,
      message: "Class log stats fetched successfully",
      data: stats,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch class log stats",
      data: null,
    });
  }
};

export const listAdminClassLogs = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const status = parseStatus(req.query.status);
    const logs = await getAdminClassLogs(status);

    res.status(200).json({
      success: true,
      message: "Class logs fetched successfully",
      data: logs,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch class logs",
      data: null,
    });
  }
};

export const approveAdminClassLog = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid class log ID",
        data: null,
      });
      return;
    }

    const log = await approveClassLog(id, req.user!._id);
    if (!log) {
      res.status(404).json({
        success: false,
        message: "Class log not found",
        data: null,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Class log approved",
      data: log,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to approve class log",
      data: null,
    });
  }
};

export const rejectAdminClassLog = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { adminNote } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid class log ID",
        data: null,
      });
      return;
    }

    const log = await rejectClassLog(id, req.user!._id, adminNote);
    if (!log) {
      res.status(404).json({
        success: false,
        message: "Class log not found",
        data: null,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Class log rejected",
      data: log,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to reject class log",
      data: null,
    });
  }
};
