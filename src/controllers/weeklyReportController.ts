import { Request, Response } from "express";
import {
  buildStudentWeeklyReport,
  buildTeacherWeeklyReport,
} from "../services/weeklyReportService";

export const getTeacherWeeklyReport = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { studentId, weekStart, weekEnd } = req.query;

    if (!studentId || typeof studentId !== "string") {
      res.status(400).json({
        success: false,
        message: "studentId query parameter is required",
        data: null,
      });
      return;
    }

    const report = await buildTeacherWeeklyReport({
      teacherId: req.user!._id,
      studentId,
      weekStart: typeof weekStart === "string" ? weekStart : undefined,
      weekEnd: typeof weekEnd === "string" ? weekEnd : undefined,
    });

    res.status(200).json({
      success: true,
      message: "Weekly report generated successfully",
      data: report,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message === "STUDENT_ACCESS_DENIED") {
      res.status(403).json({
        success: false,
        message: "You do not teach this student",
        data: null,
      });
      return;
    }
    res.status(500).json({
      success: false,
      message: "Failed to generate weekly report",
      data: null,
    });
  }
};

export const getStudentWeeklyReport = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { weekStart, weekEnd } = req.query;

    const report = await buildStudentWeeklyReport({
      studentId: req.user!._id,
      weekStart: typeof weekStart === "string" ? weekStart : undefined,
      weekEnd: typeof weekEnd === "string" ? weekEnd : undefined,
    });

    res.status(200).json({
      success: true,
      message: "Weekly report generated successfully",
      data: report,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message === "NO_CLASSES") {
      res.status(404).json({
        success: false,
        message: "No active classes found for this student",
        data: null,
      });
      return;
    }
    res.status(500).json({
      success: false,
      message: "Failed to generate weekly report",
      data: null,
    });
  }
};
