import { Request, Response } from "express";
import mongoose from "mongoose";
import { Class } from "../models/Class";
import { Homework, isSubmissionAccepted, resolveSubmissionStatus } from "../models/Homework";
import { Attendance } from "../models/Attendance";
import { Progress } from "../models/Progress";
import { createUserNotification } from "../services/notificationService";
import { Notification } from "../models/Notification";
import { getStudentTodaySchedule } from "../services/scheduleService";
import { getTodayScheduleDay } from "../utils/scheduleUtils";
import { scanComplianceText } from "../services/complianceScanService";
import {
  resolveCurriculumLabels,
  mapProgressDocsWithLabels,
  mapAssignmentLabels,
  validateCurriculumForStudent,
  isCurriculumPathComplete,
} from "../services/curriculumService";
import { User } from "../models/User";

export const getClassById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid class ID",
        data: null,
      });
      return;
    }

    const classDoc = await Class.findOne({ _id: id, students: req.user!._id })
      .populate("teacher", "name email");

    if (!classDoc) {
      res.status(404).json({
        success: false,
        message: "Class not found",
        data: null,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Class fetched successfully",
      data: classDoc,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch class",
      data: null,
    });
  }
};

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
      const status = resolveSubmissionStatus(submission);
      const labels = resolveCurriculumLabels(
        hw.curriculumProgram,
        hw.curriculumUnit,
        hw.curriculumTopic
      );

      return {
        _id: hw._id,
        title: hw.title,
        description: hw.description,
        class: hw.class,
        teacher: hw.teacher,
        dueDate: hw.dueDate,
        curriculumProgram: hw.curriculumProgram,
        curriculumUnit: hw.curriculumUnit,
        curriculumTopic: hw.curriculumTopic,
        curriculumLabels: labels,
        submitted: isSubmissionAccepted(status),
        underReview: status === "pending_review",
        canSubmit: !submission || status === "returned",
        submission: submission
          ? {
              submittedAt: submission.submittedAt,
              content: submission.content,
              status,
              reviewFeedback: submission.reviewFeedback,
              grade: submission.grade,
              feedback: submission.feedback,
              curriculumProgram: submission.curriculumProgram,
              curriculumUnit: submission.curriculumUnit,
              curriculumTopic: submission.curriculumTopic,
              curriculumLabels: resolveCurriculumLabels(
                submission.curriculumProgram,
                submission.curriculumUnit,
                submission.curriculumTopic
              ),
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
      data: mapProgressDocsWithLabels(progress),
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch progress",
      data: null,
    });
  }
};

export const getMyCurriculumPlan = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const student = await User.findById(req.user!._id).select("curriculumAssignments");
    res.status(200).json({
      success: true,
      message: "Curriculum plan fetched",
      data: mapAssignmentLabels(student?.curriculumAssignments ?? []),
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch curriculum plan",
      data: null,
    });
  }
};

export const getTodaySchedule = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const sessions = await getStudentTodaySchedule(req.user!._id);

    res.status(200).json({
      success: true,
      message: "Today's schedule fetched successfully",
      data: {
        day: getTodayScheduleDay(),
        sessions,
      },
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch today's schedule",
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

export const submitHomework = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      content,
      curriculumProgram,
      curriculumUnit,
      curriculumTopic,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid homework ID",
        data: null,
      });
      return;
    }

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      res.status(400).json({
        success: false,
        message: "Please provide content for your submission",
        data: null,
      });
      return;
    }

    const trimmedContent = content.trim();

    if (!curriculumProgram || typeof curriculumProgram !== "string") {
      res.status(400).json({
        success: false,
        message: "Please select a program, unit, and lesson topic for this submission",
        data: null,
      });
      return;
    }

    const unitId =
      typeof curriculumUnit === "string" && curriculumUnit.trim()
        ? curriculumUnit.trim()
        : undefined;
    const topicId =
      typeof curriculumTopic === "string" && curriculumTopic.trim()
        ? curriculumTopic.trim()
        : undefined;

    if (!isCurriculumPathComplete(curriculumProgram, unitId, topicId)) {
      res.status(400).json({
        success: false,
        message: "Please select the full lesson path (program, section, and topic)",
        data: null,
      });
      return;
    }

    const curriculumValid = await validateCurriculumForStudent(
      req.user!._id.toString(),
      curriculumProgram,
      unitId,
      topicId
    );
    if (!curriculumValid) {
      res.status(400).json({
        success: false,
        message: "That topic is not in your study plan",
        data: null,
      });
      return;
    }

    const compliance = scanComplianceText(trimmedContent);
    if (!compliance.passed) {
      res.status(400).json({
        success: false,
        message: compliance.message,
        data: null,
      });
      return;
    }

    const homework = await Homework.findById(id);

    if (!homework) {
      res.status(404).json({
        success: false,
        message: "Homework not found",
        data: null,
      });
      return;
    }

    const enrolled = await Class.findOne({
      _id: homework.class,
      students: req.user!._id,
    });

    if (!enrolled) {
      res.status(403).json({
        success: false,
        message: "You are not enrolled in the class this homework belongs to",
        data: null,
      });
      return;
    }

    const existingSubmission = homework.submissions.find((s) =>
      s.student.equals(req.user!._id)
    );
    const existingStatus = resolveSubmissionStatus(existingSubmission);

    if (
      existingSubmission &&
      existingStatus !== "returned"
    ) {
      res.status(409).json({
        success: false,
        message:
          existingStatus === "pending_review"
            ? "Your submission is already under teacher review"
            : "You have already submitted this homework",
        data: null,
      });
      return;
    }

    if (existingSubmission && existingStatus === "returned") {
      await Homework.findOneAndUpdate(
        { _id: id, "submissions.student": req.user!._id },
        {
          $set: {
            "submissions.$.content": trimmedContent,
            "submissions.$.submittedAt": new Date(),
            "submissions.$.status": "pending_review",
            "submissions.$.reviewFeedback": null,
            "submissions.$.reviewedAt": null,
            "submissions.$.curriculumProgram": curriculumProgram,
            "submissions.$.curriculumUnit": unitId,
            "submissions.$.curriculumTopic": topicId,
          },
        }
      );

      await createUserNotification({
        userId: homework.teacher,
        title: "Homework Resubmitted",
        message: `${req.user!.name} resubmitted "${homework.title}" for review`,
        type: "homework",
      });

      res.status(200).json({
        success: true,
        message: "Homework resubmitted for teacher review",
        data: {
          homeworkId: id,
          submission: {
            student: req.user!._id,
            submittedAt: new Date(),
            content: trimmedContent,
            status: "pending_review",
            curriculumProgram,
            curriculumUnit: unitId,
            curriculumTopic: topicId,
            grade: null,
            feedback: null,
          },
        },
      });
      return;
    }

    const newSubmission = {
      student: req.user!._id,
      submittedAt: new Date(),
      content: trimmedContent,
      status: "pending_review" as const,
      curriculumProgram,
      curriculumUnit: unitId,
      curriculumTopic: topicId,
    };

    await Homework.findByIdAndUpdate(id, {
      $push: { submissions: newSubmission },
    });

    await createUserNotification({
      userId: homework.teacher,
      title: "Homework Awaiting Review",
      message: `${req.user!.name} submitted "${homework.title}" for your review`,
      type: "homework",
    });

    res.status(201).json({
      success: true,
      message: "Homework sent for teacher review",
      data: {
        homeworkId: id,
        submission: {
          student: req.user!._id,
          submittedAt: newSubmission.submittedAt,
          content: newSubmission.content,
          status: "pending_review",
          grade: null,
          feedback: null,
        },
      },
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to submit homework",
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
