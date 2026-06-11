import { Request, Response } from "express";
import mongoose from "mongoose";
import {
  getDefaultMonthlyQuestions,
  listAdminMonthlyProgress,
  listStudentMonthlyProgress,
  listTeacherMonthlyProgress,
  upsertMonthlyProgress,
} from "../services/monthlyProgressService";

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function parseMonth(value: unknown): string | undefined {
  if (typeof value === "string" && /^\d{4}-\d{2}$/.test(value)) {
    return value;
  }
  return undefined;
}

export const getMonthlyQuestions = async (
  _req: Request,
  res: Response
): Promise<void> => {
  res.status(200).json({
    success: true,
    message: "Monthly progress questions fetched",
    data: getDefaultMonthlyQuestions(),
  });
};

export const createTeacherMonthlyProgress = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { studentId, classId, month, teacherSummary, qaResponses } = req.body;

    if (!studentId || !classId) {
      res.status(400).json({
        success: false,
        message: "studentId and classId are required",
        data: null,
      });
      return;
    }

    const snapshot = await upsertMonthlyProgress({
      teacherId: req.user!._id,
      studentId,
      classId,
      month: typeof month === "string" && month ? month : currentMonth(),
      teacherSummary,
      qaResponses,
    });

    res.status(201).json({
      success: true,
      message: "Monthly progress snapshot saved",
      data: snapshot,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message === "CLASS_ACCESS_DENIED") {
      res.status(403).json({
        success: false,
        message: "You do not teach this student in this class",
        data: null,
      });
      return;
    }
    res.status(500).json({
      success: false,
      message: "Failed to save monthly progress",
      data: null,
    });
  }
};

export const listTeacherMonthlyProgressHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const month = parseMonth(req.query.month);
    const data = await listTeacherMonthlyProgress(req.user!._id, month);

    res.status(200).json({
      success: true,
      message: "Monthly progress fetched successfully",
      data,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch monthly progress",
      data: null,
    });
  }
};

export const listStudentMonthlyProgressHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const month = parseMonth(req.query.month);
    const data = await listStudentMonthlyProgress(req.user!._id, month);

    res.status(200).json({
      success: true,
      message: "Monthly progress fetched successfully",
      data,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch monthly progress",
      data: null,
    });
  }
};

export const listAdminMonthlyProgressHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const month = parseMonth(req.query.month);
    const data = await listAdminMonthlyProgress(month);

    res.status(200).json({
      success: true,
      message: "Monthly progress fetched successfully",
      data,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch monthly progress",
      data: null,
    });
  }
};

export const getTeacherMonthlyProgressById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid snapshot ID",
        data: null,
      });
      return;
    }

    const month = parseMonth(req.query.month);
    const data = await listTeacherMonthlyProgress(req.user!._id, month);
    const snapshot = data.find((s) => s._id === id);

    if (!snapshot) {
      res.status(404).json({
        success: false,
        message: "Monthly progress snapshot not found",
        data: null,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Monthly progress fetched successfully",
      data: snapshot,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch monthly progress",
      data: null,
    });
  }
};
