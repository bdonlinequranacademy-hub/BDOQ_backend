"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAsRead = exports.submitHomework = exports.getMyNotifications = exports.getTodaySchedule = exports.getMyCurriculumPlan = exports.getMyProgress = exports.getMyAttendance = exports.getMyHomework = exports.getMyClasses = exports.getClassById = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Class_1 = require("../models/Class");
const Homework_1 = require("../models/Homework");
const Attendance_1 = require("../models/Attendance");
const Progress_1 = require("../models/Progress");
const notificationService_1 = require("../services/notificationService");
const Notification_1 = require("../models/Notification");
const scheduleService_1 = require("../services/scheduleService");
const scheduleUtils_1 = require("../utils/scheduleUtils");
const complianceScanService_1 = require("../services/complianceScanService");
const curriculumService_1 = require("../services/curriculumService");
const User_1 = require("../models/User");
const getClassById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid class ID",
                data: null,
            });
            return;
        }
        const classDoc = await Class_1.Class.findOne({ _id: id, students: req.user._id })
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
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch class",
            data: null,
        });
    }
};
exports.getClassById = getClassById;
const getMyClasses = async (req, res) => {
    try {
        const classes = await Class_1.Class.find({ students: req.user._id })
            .populate("teacher", "name email")
            .sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            message: "Classes fetched successfully",
            data: classes,
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch classes",
            data: null,
        });
    }
};
exports.getMyClasses = getMyClasses;
const getMyHomework = async (req, res) => {
    try {
        const studentId = req.user._id.toString();
        const enrolledClasses = await Class_1.Class.find({ students: req.user._id }).select("_id");
        const classIds = enrolledClasses.map((c) => c._id);
        const homework = await Homework_1.Homework.find({ class: { $in: classIds } })
            .populate("class", "title")
            .populate("teacher", "name")
            .sort({ dueDate: 1 });
        const homeworkWithSubmission = homework.map((hw) => {
            const submission = hw.submissions.find((s) => s.student.toString() === studentId);
            const status = (0, Homework_1.resolveSubmissionStatus)(submission);
            const labels = (0, curriculumService_1.resolveCurriculumLabels)(hw.curriculumProgram, hw.curriculumUnit, hw.curriculumTopic);
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
                submitted: (0, Homework_1.isSubmissionAccepted)(status),
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
                        curriculumLabels: (0, curriculumService_1.resolveCurriculumLabels)(submission.curriculumProgram, submission.curriculumUnit, submission.curriculumTopic),
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
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch homework",
            data: null,
        });
    }
};
exports.getMyHomework = getMyHomework;
const getMyAttendance = async (req, res) => {
    try {
        const records = await Attendance_1.Attendance.find({ student: req.user._id })
            .populate("class", "title")
            .sort({ date: -1 });
        const present = records.filter((r) => r.status === "present").length;
        const absent = records.filter((r) => r.status === "absent").length;
        const late = records.filter((r) => r.status === "late").length;
        const total = records.length;
        const percentage = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
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
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch attendance",
            data: null,
        });
    }
};
exports.getMyAttendance = getMyAttendance;
const getMyProgress = async (req, res) => {
    try {
        const progress = await Progress_1.Progress.find({ student: req.user._id })
            .populate("class", "title")
            .populate("updatedBy", "name")
            .sort({ updatedAt: -1 });
        res.status(200).json({
            success: true,
            message: "Progress fetched successfully",
            data: (0, curriculumService_1.mapProgressDocsWithLabels)(progress),
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch progress",
            data: null,
        });
    }
};
exports.getMyProgress = getMyProgress;
const getMyCurriculumPlan = async (req, res) => {
    try {
        const student = await User_1.User.findById(req.user._id).select("curriculumAssignments");
        res.status(200).json({
            success: true,
            message: "Curriculum plan fetched",
            data: (0, curriculumService_1.mapAssignmentLabels)(student?.curriculumAssignments ?? []),
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch curriculum plan",
            data: null,
        });
    }
};
exports.getMyCurriculumPlan = getMyCurriculumPlan;
const getTodaySchedule = async (req, res) => {
    try {
        const sessions = await (0, scheduleService_1.getStudentTodaySchedule)(req.user._id);
        res.status(200).json({
            success: true,
            message: "Today's schedule fetched successfully",
            data: {
                day: (0, scheduleUtils_1.getTodayScheduleDay)(),
                sessions,
            },
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch today's schedule",
            data: null,
        });
    }
};
exports.getTodaySchedule = getTodaySchedule;
const getMyNotifications = async (req, res) => {
    try {
        const notifications = await Notification_1.Notification.find({ user: req.user._id }).sort({
            createdAt: -1,
        });
        res.status(200).json({
            success: true,
            message: "Notifications fetched successfully",
            data: notifications,
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch notifications",
            data: null,
        });
    }
};
exports.getMyNotifications = getMyNotifications;
const submitHomework = async (req, res) => {
    try {
        const { id } = req.params;
        const { content, curriculumProgram, curriculumUnit, curriculumTopic, } = req.body;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
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
        const unitId = typeof curriculumUnit === "string" && curriculumUnit.trim()
            ? curriculumUnit.trim()
            : undefined;
        const topicId = typeof curriculumTopic === "string" && curriculumTopic.trim()
            ? curriculumTopic.trim()
            : undefined;
        if (!(0, curriculumService_1.isCurriculumPathComplete)(curriculumProgram, unitId, topicId)) {
            res.status(400).json({
                success: false,
                message: "Please select the full lesson path (program, section, and topic)",
                data: null,
            });
            return;
        }
        const curriculumValid = await (0, curriculumService_1.validateCurriculumForStudent)(req.user._id.toString(), curriculumProgram, unitId, topicId);
        if (!curriculumValid) {
            res.status(400).json({
                success: false,
                message: "That topic is not in your study plan",
                data: null,
            });
            return;
        }
        const compliance = (0, complianceScanService_1.scanComplianceText)(trimmedContent);
        if (!compliance.passed) {
            res.status(400).json({
                success: false,
                message: compliance.message,
                data: null,
            });
            return;
        }
        const homework = await Homework_1.Homework.findById(id);
        if (!homework) {
            res.status(404).json({
                success: false,
                message: "Homework not found",
                data: null,
            });
            return;
        }
        const enrolled = await Class_1.Class.findOne({
            _id: homework.class,
            students: req.user._id,
        });
        if (!enrolled) {
            res.status(403).json({
                success: false,
                message: "You are not enrolled in the class this homework belongs to",
                data: null,
            });
            return;
        }
        const existingSubmission = homework.submissions.find((s) => s.student.equals(req.user._id));
        const existingStatus = (0, Homework_1.resolveSubmissionStatus)(existingSubmission);
        if (existingSubmission &&
            existingStatus !== "returned") {
            res.status(409).json({
                success: false,
                message: existingStatus === "pending_review"
                    ? "Your submission is already under teacher review"
                    : "You have already submitted this homework",
                data: null,
            });
            return;
        }
        if (existingSubmission && existingStatus === "returned") {
            await Homework_1.Homework.findOneAndUpdate({ _id: id, "submissions.student": req.user._id }, {
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
            });
            await (0, notificationService_1.createUserNotification)({
                userId: homework.teacher,
                title: "Homework Resubmitted",
                message: `${req.user.name} resubmitted "${homework.title}" for review`,
                type: "homework",
            });
            res.status(200).json({
                success: true,
                message: "Homework resubmitted for teacher review",
                data: {
                    homeworkId: id,
                    submission: {
                        student: req.user._id,
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
            student: req.user._id,
            submittedAt: new Date(),
            content: trimmedContent,
            status: "pending_review",
            curriculumProgram,
            curriculumUnit: unitId,
            curriculumTopic: topicId,
        };
        await Homework_1.Homework.findByIdAndUpdate(id, {
            $push: { submissions: newSubmission },
        });
        await (0, notificationService_1.createUserNotification)({
            userId: homework.teacher,
            title: "Homework Awaiting Review",
            message: `${req.user.name} submitted "${homework.title}" for your review`,
            type: "homework",
        });
        res.status(201).json({
            success: true,
            message: "Homework sent for teacher review",
            data: {
                homeworkId: id,
                submission: {
                    student: req.user._id,
                    submittedAt: newSubmission.submittedAt,
                    content: newSubmission.content,
                    status: "pending_review",
                    grade: null,
                    feedback: null,
                },
            },
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to submit homework",
            data: null,
        });
    }
};
exports.submitHomework = submitHomework;
const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid notification ID",
                data: null,
            });
            return;
        }
        const notification = await Notification_1.Notification.findOneAndUpdate({ _id: id, user: req.user._id }, { isRead: true }, { new: true });
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
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to update notification",
            data: null,
        });
    }
};
exports.markAsRead = markAsRead;
