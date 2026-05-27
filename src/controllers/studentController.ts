import { Request, Response } from "express";
import mongoose from "mongoose";
import { Class } from "../models/Class";
import { Homework } from "../models/Homework";
import { Attendance } from "../models/Attendance";
import { Progress } from "../models/Progress";
import { Notification } from "../models/Notification";

export const getMyClasses = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const classes = await Class.find({ students: req.user!._id })
      .populate("teacher", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Classes fetched successfully",
      data: classes,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch classes",
      data: null,
    });
  }
};

export const getMyHomework = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const studentId = req.user!._id.toString();

    const enrolledClasses = await Class.find({ students: req.user!._id }).select(
      "_id"
    );
    const classIds = enrolledClasses.map((c) => c._id);

    const homework = await Homework.find({ class: { $in: classIds } })
      .populate("class", "title")
      .populate("teacher", "name")
      .sort({ dueDate: 1 });

    const homeworkWithSubmission = homework.map((hw) => {
      const submission = hw.submissions.find(
        (s) => s.student.toString() === studentId
      );

      return {
        _id: hw._id,
        title: hw.title,
        description: hw.description,
        class: hw.class,
        teacher: hw.teacher,
        dueDate: hw.dueDate,
        submitted: !!submission,
        submission: submission
          ? {
              submittedAt: submission.submittedAt,
              content: submission.content,
              grade: submission.grade,
              feedback: submission.feedback,
            }
          : null,
        createdAt: hw.createdAt,
        updatedAt: hw.updatedAt,
      };
    });

    res.status(200).json({
      success: true,
      message: "Homework fetched successfully",
      data: homeworkWithSubmission,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch homework",
      data: null,
    });
  }
};

export const getMyAttendance = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const records = await Attendance.find({ student: req.user!._id })
      .populate("class", "title")
      .sort({ date: -1 });

    const present = records.filter((r) => r.status === "present").length;
    const absent = records.filter((r) => r.status === "absent").length;
    const late = records.filter((r) => r.status === "late").length;
    const total = records.length;
    const percentage =
      total > 0 ? Math.round(((present + late) / total) * 100) : 0;

    res.status(200).json({
      success: true,
      message: "Attendance fetched successfully",
      data: {
        records,
        summary: {
          total,
          present,
          absent,
          late,
          percentage,
        },
      },
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch attendance",
      data: null,
    });
  }
};

export const getMyProgress = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const progress = await Progress.find({ student: req.user!._id })
      .populate("class", "title")
      .populate("updatedBy", "name")
      .sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      message: "Progress fetched successfully",
      data: progress,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch progress",
      data: null,
    });
  }
};

export const getMyNotifications = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const notifications = await Notification.find({ user: req.user!._id }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      message: "Notifications fetched successfully",
      data: notifications,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch notifications",
      data: null,
    });
  }
};

export const markAsRead = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid notification ID",
        data: null,
      });
      return;
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: id, user: req.user!._id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      res.status(404).json({
        success: false,
        message: "Notification not found",
        data: null,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Notification marked as read",
      data: notification,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to update notification",
      data: null,
    });
  }
};
