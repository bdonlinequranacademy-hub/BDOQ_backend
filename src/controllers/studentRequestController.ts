import { Request, Response } from "express";
import type { StudentRequestStatus } from "../models/StudentRequest";
import {
  createStudentRequest,
  listAdminStudentRequests,
  listTeacherStudentRequests,
  resolveStudentRequest,
} from "../services/studentRequestService";

function parseStatus(value: unknown): StudentRequestStatus | undefined {
  if (value === "pending" || value === "approved" || value === "rejected") {
    return value;
  }
  return undefined;
}

export const createTeacherStudentRequest = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { message, preferredCourseType } = req.body;

    if (!message?.trim()) {
      res.status(400).json({
        success: false,
        message: "message is required",
        data: null,
      });
      return;
    }

    const data = await createStudentRequest(
      req.user!._id,
      message,
      preferredCourseType
    );

    res.status(201).json({
      success: true,
      message: "Request submitted to admin",
      data,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to submit request",
      data: null,
    });
  }
};

export const listTeacherStudentRequestsHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const data = await listTeacherStudentRequests(req.user!._id);
    res.status(200).json({
      success: true,
      message: "Requests fetched successfully",
      data,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch requests",
      data: null,
    });
  }
};

export const listAdminStudentRequestsHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const status = parseStatus(req.query.status);
    const data = await listAdminStudentRequests(status);
    res.status(200).json({
      success: true,
      message: "Requests fetched successfully",
      data,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch requests",
      data: null,
    });
  }
};

export const approveStudentRequest = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { adminNote } = req.body;
    const data = await resolveStudentRequest(id, req.user!._id, "approved", adminNote);

    if (!data) {
      res.status(404).json({
        success: false,
        message: "Request not found",
        data: null,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Request approved",
      data,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to approve request",
      data: null,
    });
  }
};

export const rejectStudentRequest = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { adminNote } = req.body;
    const data = await resolveStudentRequest(id, req.user!._id, "rejected", adminNote);

    if (!data) {
      res.status(404).json({
        success: false,
        message: "Request not found",
        data: null,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Request rejected",
      data,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to reject request",
      data: null,
    });
  }
};
