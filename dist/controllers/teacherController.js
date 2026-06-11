"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markNotificationRead = exports.getMyNotifications = exports.getWeeklyRoutine = exports.getTodaySchedule = exports.getAttendanceReport = exports.updateProgress = exports.gradeSubmission = exports.getHomeworkDetail = exports.getClassHomework = exports.createHomework = exports.markAttendance = exports.getMyClasses = exports.getStudentProgress = exports.getMyStudents = exports.getClassById = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Class_1 = require("../models/Class");
const Attendance_1 = require("../models/Attendance");
const Homework_1 = require("../models/Homework");
const Progress_1 = require("../models/Progress");
const Notification_1 = require("../models/Notification");
const scheduleService_1 = require("../services/scheduleService");
const scheduleUtils_1 = require("../utils/scheduleUtils");
const VALID_STATUSES = ["present", "absent", "late"];
const getTeacherClass = async (classId, teacherId) => {
    if (!mongoose_1.default.Types.ObjectId.isValid(classId)) {
        return null;
    }
    return Class_1.Class.findOne({ _id: classId, teacher: teacherId });
};
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
        const classDoc = await Class_1.Class.findOne({ _id: id, teacher: req.user._id })
            .populate("students", "name email");
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
const getMyStudents = async (req, res) => {
    try {
        const classes = await Class_1.Class.find({ teacher: req.user._id }).populate("students", "name email studentId country timezone");
        const studentMap = new Map();
        for (const cls of classes) {
            for (const student of cls.students) {
                const id = student._id.toString();
                if (!studentMap.has(id)) {
                    studentMap.set(id, {
                        _id: student._id,
                        name: student.name,
                        email: student.email,
                        studentId: student.studentId,
                        country: student.country,
                        timezone: student.timezone,
                        classes: [],
                    });
                }
                studentMap.get(id).classes.push({ _id: cls._id, title: cls.title });
            }
        }
        res.status(200).json({
            success: true,
            message: "Students fetched successfully",
            data: Array.from(studentMap.values()),
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch students",
            data: null,
        });
    }
};
exports.getMyStudents = getMyStudents;
const getStudentProgress = async (req, res) => {
    try {
        const { studentId } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(studentId)) {
            res.status(400).json({
                success: false,
                message: "Invalid student ID",
                data: null,
            });
            return;
        }
        const teacherClasses = await Class_1.Class.find({ teacher: req.user._id }).select("_id");
        const classIds = teacherClasses.map((c) => c._id);
        const studentInClass = await Class_1.Class.exists({
            teacher: req.user._id,
            students: studentId,
        });
        if (!studentInClass) {
            res.status(403).json({
                success: false,
                message: "Access denied for this student",
                data: null,
            });
            return;
        }
        const progress = await Progress_1.Progress.find({
            student: studentId,
            class: { $in: classIds },
        })
            .populate("class", "title")
            .populate("updatedBy", "name")
            .sort({ updatedAt: -1 });
        res.status(200).json({
            success: true,
            message: "Student progress fetched successfully",
            data: progress,
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch student progress",
            data: null,
        });
    }
};
exports.getStudentProgress = getStudentProgress;
const getMyClasses = async (req, res) => {
    try {
        const classes = await Class_1.Class.find({ teacher: req.user._id })
            .populate("students", "name")
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
const markAttendance = async (req, res) => {
    try {
        const { classId, date, attendances } = req.body;
        if (!classId || !date || !Array.isArray(attendances) || attendances.length === 0) {
            res.status(400).json({
                success: false,
                message: "Please provide classId, date, and attendances array",
                data: null,
            });
            return;
        }
        const classDoc = await getTeacherClass(classId, req.user._id);
        if (!classDoc) {
            res.status(404).json({
                success: false,
                message: "Class not found or access denied",
                data: null,
            });
            return;
        }
        const attendanceDate = new Date(date);
        attendanceDate.setHours(0, 0, 0, 0);
        const enrolledIds = new Set(classDoc.students.map((s) => s.toString()));
        for (const entry of attendances) {
            const { studentId, status } = entry;
            if (!studentId || !status) {
                res.status(400).json({
                    success: false,
                    message: "Each attendance entry requires studentId and status",
                    data: null,
                });
                return;
            }
            if (!VALID_STATUSES.includes(status)) {
                res.status(400).json({
                    success: false,
                    message: "Invalid attendance status",
                    data: null,
                });
                return;
            }
            if (!enrolledIds.has(studentId)) {
                res.status(400).json({
                    success: false,
                    message: "Student is not enrolled in this class",
                    data: null,
                });
                return;
            }
            await Attendance_1.Attendance.findOneAndUpdate({ class: classId, student: studentId, date: attendanceDate }, { status, markedBy: req.user._id }, { upsert: true, new: true });
            if (status === "absent") {
                await Notification_1.Notification.create({
                    user: studentId,
                    title: "Attendance Update",
                    message: `You were marked absent for ${classDoc.title} on ${attendanceDate.toLocaleDateString()}`,
                    type: "attendance",
                });
            }
        }
        res.status(200).json({
            success: true,
            message: "Attendance marked successfully",
            data: null,
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to mark attendance",
            data: null,
        });
    }
};
exports.markAttendance = markAttendance;
const createHomework = async (req, res) => {
    try {
        const { title, description, classId, dueDate } = req.body;
        if (!title || !classId || !dueDate) {
            res.status(400).json({
                success: false,
                message: "Please provide title, classId, and dueDate",
                data: null,
            });
            return;
        }
        const classDoc = await getTeacherClass(classId, req.user._id);
        if (!classDoc) {
            res.status(404).json({
                success: false,
                message: "Class not found or access denied",
                data: null,
            });
            return;
        }
        const homework = await Homework_1.Homework.create({
            title,
            description: description?.trim() || "",
            class: classId,
            teacher: req.user._id,
            dueDate: new Date(dueDate),
        });
        const notifications = classDoc.students.map((studentId) => ({
            user: studentId,
            title: "New Homework Assigned",
            message: `New homework "${title}" has been assigned for ${classDoc.title}`,
            type: "homework",
        }));
        if (notifications.length > 0) {
            await Notification_1.Notification.insertMany(notifications);
        }
        res.status(201).json({
            success: true,
            message: "Homework created successfully",
            data: homework,
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to create homework",
            data: null,
        });
    }
};
exports.createHomework = createHomework;
const getClassHomework = async (req, res) => {
    try {
        const teacherClasses = await Class_1.Class.find({ teacher: req.user._id }).select("_id");
        const classIds = teacherClasses.map((c) => c._id);
        const homework = await Homework_1.Homework.find({
            teacher: req.user._id,
            class: { $in: classIds },
        })
            .populate("class", "title")
            .sort({ dueDate: -1 });
        const homeworkWithCounts = homework.map((hw) => ({
            _id: hw._id,
            title: hw.title,
            description: hw.description,
            class: hw.class,
            teacher: hw.teacher,
            dueDate: hw.dueDate,
            submissionCount: hw.submissions.length,
            createdAt: hw.createdAt,
            updatedAt: hw.updatedAt,
        }));
        res.status(200).json({
            success: true,
            message: "Homework fetched successfully",
            data: homeworkWithCounts,
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
exports.getClassHomework = getClassHomework;
const getHomeworkDetail = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid homework ID",
                data: null,
            });
            return;
        }
        const homework = await Homework_1.Homework.findById(id)
            .populate("class", "title")
            .populate("submissions.student", "name email");
        if (!homework) {
            res.status(404).json({
                success: false,
                message: "Homework not found",
                data: null,
            });
            return;
        }
        if (!homework.teacher.equals(req.user._id)) {
            res.status(403).json({
                success: false,
                message: "Access denied",
                data: null,
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: "Homework fetched successfully",
            data: homework,
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
exports.getHomeworkDetail = getHomeworkDetail;
const gradeSubmission = async (req, res) => {
    try {
        const { id } = req.params;
        const { studentId, grade, feedback } = req.body;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid homework ID",
                data: null,
            });
            return;
        }
        if (!studentId || !mongoose_1.default.Types.ObjectId.isValid(studentId)) {
            res.status(400).json({
                success: false,
                message: "Please provide a valid studentId",
                data: null,
            });
            return;
        }
        if (!grade || typeof grade !== "string" || grade.trim().length === 0) {
            res.status(400).json({
                success: false,
                message: "Please provide a grade",
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
        if (!homework.teacher.equals(req.user._id)) {
            res.status(403).json({
                success: false,
                message: "Access denied",
                data: null,
            });
            return;
        }
        const submissionExists = homework.submissions.some((s) => s.student.equals(studentId));
        if (!submissionExists) {
            res.status(404).json({
                success: false,
                message: "No submission found for this student",
                data: null,
            });
            return;
        }
        await Homework_1.Homework.findOneAndUpdate({ _id: id }, {
            $set: {
                "submissions.$[elem].grade": grade.trim(),
                "submissions.$[elem].feedback": feedback?.trim() ?? null,
            },
        }, {
            arrayFilters: [{ "elem.student": new mongoose_1.default.Types.ObjectId(studentId) }],
            new: true,
        });
        res.status(200).json({
            success: true,
            message: "Submission graded successfully",
            data: {
                homeworkId: id,
                studentId,
                grade: grade.trim(),
                feedback: feedback?.trim() ?? null,
            },
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to grade submission",
            data: null,
        });
    }
};
exports.gradeSubmission = gradeSubmission;
const updateProgress = async (req, res) => {
    try {
        const { studentId, classId, surahsCompleted, tajweedScore, memorizedAyahs, notes, } = req.body;
        if (!studentId || !classId) {
            res.status(400).json({
                success: false,
                message: "Please provide studentId and classId",
                data: null,
            });
            return;
        }
        const classDoc = await getTeacherClass(classId, req.user._id);
        if (!classDoc) {
            res.status(404).json({
                success: false,
                message: "Class not found or access denied",
                data: null,
            });
            return;
        }
        if (!classDoc.students.some((s) => s.toString() === studentId)) {
            res.status(400).json({
                success: false,
                message: "Student is not enrolled in this class",
                data: null,
            });
            return;
        }
        const updateData = {
            updatedBy: req.user._id,
        };
        if (surahsCompleted !== undefined)
            updateData.surahsCompleted = surahsCompleted;
        if (tajweedScore !== undefined)
            updateData.tajweedScore = tajweedScore;
        if (memorizedAyahs !== undefined)
            updateData.memorizedAyahs = memorizedAyahs;
        if (notes !== undefined)
            updateData.notes = notes;
        const progress = await Progress_1.Progress.findOneAndUpdate({ student: studentId, class: classId }, { $set: updateData, $setOnInsert: { student: studentId, class: classId } }, { upsert: true, new: true, runValidators: true })
            .populate("class", "title")
            .populate("updatedBy", "name");
        res.status(200).json({
            success: true,
            message: "Progress updated successfully",
            data: progress,
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to update progress",
            data: null,
        });
    }
};
exports.updateProgress = updateProgress;
const getAttendanceReport = async (req, res) => {
    try {
        const { classId } = req.query;
        if (!classId || typeof classId !== "string") {
            res.status(400).json({
                success: false,
                message: "Please provide classId query parameter",
                data: null,
            });
            return;
        }
        const classDoc = await getTeacherClass(classId, req.user._id);
        if (!classDoc) {
            res.status(404).json({
                success: false,
                message: "Class not found or access denied",
                data: null,
            });
            return;
        }
        const records = await Attendance_1.Attendance.find({ class: classId }).populate("student", "name email");
        const reportMap = new Map();
        for (const record of records) {
            const student = record.student;
            const id = student._id.toString();
            if (!reportMap.has(id)) {
                reportMap.set(id, {
                    student: { name: student.name, email: student.email },
                    total: 0,
                    present: 0,
                    absent: 0,
                    late: 0,
                });
            }
            const entry = reportMap.get(id);
            entry.total++;
            if (record.status === "present")
                entry.present++;
            else if (record.status === "absent")
                entry.absent++;
            else if (record.status === "late")
                entry.late++;
        }
        const report = Array.from(reportMap.values()).map((entry) => ({
            student: entry.student,
            total: entry.total,
            present: entry.present,
            absent: entry.absent,
            percentage: entry.total > 0
                ? Math.round(((entry.present + entry.late) / entry.total) * 100)
                : 0,
        }));
        res.status(200).json({
            success: true,
            message: "Attendance report fetched successfully",
            data: report,
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch attendance report",
            data: null,
        });
    }
};
exports.getAttendanceReport = getAttendanceReport;
const getTodaySchedule = async (req, res) => {
    try {
        const sessions = await (0, scheduleService_1.getTeacherTodaySchedule)(req.user._id);
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
const getWeeklyRoutine = async (req, res) => {
    try {
        const sessions = await (0, scheduleService_1.getTeacherWeeklyRoutine)(req.user._id);
        res.status(200).json({
            success: true,
            message: "Weekly routine fetched successfully",
            data: sessions,
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch weekly routine",
            data: null,
        });
    }
};
exports.getWeeklyRoutine = getWeeklyRoutine;
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
