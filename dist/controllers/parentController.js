"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markNotificationRead = exports.getMyNotifications = exports.getChildTodaySchedule = exports.getChildProgress = exports.getChildAttendance = exports.getChildHomework = exports.getChildClasses = exports.getChildren = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const User_1 = require("../models/User");
const Class_1 = require("../models/Class");
const Homework_1 = require("../models/Homework");
const Attendance_1 = require("../models/Attendance");
const Progress_1 = require("../models/Progress");
const Notification_1 = require("../models/Notification");
const curriculumService_1 = require("../services/curriculumService");
const scheduleService_1 = require("../services/scheduleService");
async function assertChildAccess(req, res, childId) {
    if (!mongoose_1.default.Types.ObjectId.isValid(childId)) {
        res.status(400).json({
            success: false,
            message: "Invalid child ID",
            data: null,
        });
        return false;
    }
    const parent = await User_1.User.findById(req.user._id).select("children");
    const linked = parent?.children?.some((id) => id.toString() === childId);
    if (!linked) {
        res.status(403).json({
            success: false,
            message: "This child is not linked to your account",
            data: null,
        });
        return false;
    }
    const child = await User_1.User.findOne({ _id: childId, role: "student" });
    if (!child) {
        res.status(404).json({
            success: false,
            message: "Student not found",
            data: null,
        });
        return false;
    }
    return true;
}
const getChildren = async (req, res) => {
    try {
        const parent = await User_1.User.findById(req.user._id)
            .populate("children", "name email role")
            .select("children");
        if (!parent) {
            res.status(404).json({
                success: false,
                message: "User not found",
                data: null,
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: "Children fetched successfully",
            data: parent.children ?? [],
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch children",
            data: null,
        });
    }
};
exports.getChildren = getChildren;
const getChildClasses = async (req, res) => {
    try {
        const { id: childId } = req.params;
        if (!(await assertChildAccess(req, res, childId)))
            return;
        const classes = await Class_1.Class.find({ students: childId })
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
exports.getChildClasses = getChildClasses;
const getChildHomework = async (req, res) => {
    try {
        const { id: childId } = req.params;
        if (!(await assertChildAccess(req, res, childId)))
            return;
        const enrolledClasses = await Class_1.Class.find({ students: childId }).select("_id");
        const classIds = enrolledClasses.map((c) => c._id);
        const homework = await Homework_1.Homework.find({ class: { $in: classIds } })
            .populate("class", "title")
            .populate("teacher", "name")
            .sort({ dueDate: 1 });
        const homeworkWithSubmission = homework.map((hw) => {
            const submission = hw.submissions.find((s) => s.student.toString() === childId);
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
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch homework",
            data: null,
        });
    }
};
exports.getChildHomework = getChildHomework;
const getChildAttendance = async (req, res) => {
    try {
        const { id: childId } = req.params;
        if (!(await assertChildAccess(req, res, childId)))
            return;
        const records = await Attendance_1.Attendance.find({ student: childId })
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
exports.getChildAttendance = getChildAttendance;
const getChildProgress = async (req, res) => {
    try {
        const { id: childId } = req.params;
        if (!(await assertChildAccess(req, res, childId)))
            return;
        const progress = await Progress_1.Progress.find({ student: childId })
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
exports.getChildProgress = getChildProgress;
const getChildTodaySchedule = async (req, res) => {
    try {
        const { id: childId } = req.params;
        if (!(await assertChildAccess(req, res, childId)))
            return;
        const data = await (0, scheduleService_1.getStudentTodaySchedule)(new mongoose_1.default.Types.ObjectId(childId));
        res.status(200).json({
            success: true,
            message: "Today's schedule fetched successfully",
            data,
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
exports.getChildTodaySchedule = getChildTodaySchedule;
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
const markNotificationRead = async (req, res) => {
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
exports.markNotificationRead = markNotificationRead;
