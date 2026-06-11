"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeStudentFromClass = exports.assignStudentToClass = exports.getAllProgress = exports.getAttendanceOverview = exports.getAllHomework = exports.getDashboardStats = exports.getAllClasses = exports.getClassById = exports.updateClass = exports.createClass = exports.deleteClass = exports.deleteUser = exports.updateUser = exports.createUser = exports.getUserById = exports.getAllUsers = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const mongoose_1 = __importDefault(require("mongoose"));
const User_1 = require("../models/User");
const Class_1 = require("../models/Class");
const Homework_1 = require("../models/Homework");
const Attendance_1 = require("../models/Attendance");
const Progress_1 = require("../models/Progress");
const Notification_1 = require("../models/Notification");
const studentId_1 = require("../utils/studentId");
const scheduleService_1 = require("../services/scheduleService");
const DAY_NAMES = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
];
const ASSIGNABLE_ROLES = ["student", "teacher", "admin"];
const formatUser = (user) => ({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role === "parent" ? "student" : user.role,
    isActive: user.isActive,
    children: user.children?.map((id) => id.toString()) ?? [],
    studentId: user.studentId ?? undefined,
    timezone: user.timezone ?? "Asia/Dhaka",
    country: user.country ?? undefined,
    createdAt: user.createdAt,
});
const getAllUsers = async (req, res) => {
    try {
        const { role } = req.query;
        const filter = {};
        if (role) {
            if (role === "parent") {
                res.status(400).json({
                    success: false,
                    message: "Parent role is no longer used. Use student.",
                    data: null,
                });
                return;
            }
            if (!ASSIGNABLE_ROLES.includes(role)) {
                res.status(400).json({
                    success: false,
                    message: "Invalid role filter",
                    data: null,
                });
                return;
            }
            filter.role = role;
        }
        const users = await User_1.User.find(filter).select("-password").sort({
            createdAt: -1,
        });
        res.status(200).json({
            success: true,
            message: "Users fetched successfully",
            data: users.map((u) => formatUser(u)),
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch users",
            data: null,
        });
    }
};
exports.getAllUsers = getAllUsers;
const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid user ID",
                data: null,
            });
            return;
        }
        const user = await User_1.User.findById(id).select("-password");
        if (!user) {
            res.status(404).json({
                success: false,
                message: "User not found",
                data: null,
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: "User fetched successfully",
            data: formatUser(user),
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch user",
            data: null,
        });
    }
};
exports.getUserById = getUserById;
const createUser = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        if (!name || !email || !password) {
            res.status(400).json({
                success: false,
                message: "Please provide name, email, and password",
                data: null,
            });
            return;
        }
        if (role && role === "parent") {
            res.status(400).json({
                success: false,
                message: "Parent role is no longer used. Use student.",
                data: null,
            });
            return;
        }
        if (role && !ASSIGNABLE_ROLES.includes(role)) {
            res.status(400).json({
                success: false,
                message: "Invalid role",
                data: null,
            });
            return;
        }
        const existingUser = await User_1.User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            res.status(400).json({
                success: false,
                message: "Email already exists",
                data: null,
            });
            return;
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const assignRole = (role || "student");
        const userPayload = {
            name,
            email,
            password: hashedPassword,
            role: assignRole,
            emailVerified: true,
        };
        if (assignRole === "student") {
            userPayload.studentId = await (0, studentId_1.generateStudentId)();
            userPayload.timezone = "Asia/Dhaka";
        }
        const user = await User_1.User.create(userPayload);
        res.status(201).json({
            success: true,
            message: "User created successfully",
            data: formatUser(user),
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to create user",
            data: null,
        });
    }
};
exports.createUser = createUser;
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, role, isActive, children } = req.body;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid user ID",
                data: null,
            });
            return;
        }
        if (role && role === "parent") {
            res.status(400).json({
                success: false,
                message: "Parent role is no longer used. Use student.",
                data: null,
            });
            return;
        }
        if (role && !ASSIGNABLE_ROLES.includes(role)) {
            res.status(400).json({
                success: false,
                message: "Invalid role",
                data: null,
            });
            return;
        }
        if (email) {
            const duplicate = await User_1.User.findOne({
                email: email.toLowerCase(),
                _id: { $ne: id },
            });
            if (duplicate) {
                res.status(400).json({
                    success: false,
                    message: "Email already exists",
                    data: null,
                });
                return;
            }
        }
        if (children !== undefined) {
            if (!Array.isArray(children)) {
                res.status(400).json({
                    success: false,
                    message: "children must be an array of student IDs",
                    data: null,
                });
                return;
            }
            const childIds = children;
            for (const childId of childIds) {
                if (!mongoose_1.default.Types.ObjectId.isValid(childId)) {
                    res.status(400).json({
                        success: false,
                        message: `Invalid child ID: ${childId}`,
                        data: null,
                    });
                    return;
                }
            }
            if (childIds.length > 0) {
                const students = await User_1.User.find({
                    _id: { $in: childIds },
                    role: "student",
                });
                if (students.length !== childIds.length) {
                    res.status(400).json({
                        success: false,
                        message: "All linked children must be valid student accounts",
                        data: null,
                    });
                    return;
                }
            }
        }
        const updateData = {};
        if (name !== undefined)
            updateData.name = name;
        if (email !== undefined)
            updateData.email = email;
        if (role !== undefined)
            updateData.role = role;
        if (isActive !== undefined)
            updateData.isActive = isActive;
        if (children !== undefined)
            updateData.children = children;
        const user = await User_1.User.findByIdAndUpdate(id, updateData, {
            new: true,
            runValidators: true,
        }).select("-password");
        if (!user) {
            res.status(404).json({
                success: false,
                message: "User not found",
                data: null,
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: "User updated successfully",
            data: formatUser(user),
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to update user",
            data: null,
        });
    }
};
exports.updateUser = updateUser;
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid user ID",
                data: null,
            });
            return;
        }
        const user = await User_1.User.findByIdAndUpdate(id, { isActive: false }, { new: true }).select("-password");
        if (!user) {
            res.status(404).json({
                success: false,
                message: "User not found",
                data: null,
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: "User deactivated successfully",
            data: null,
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to delete user",
            data: null,
        });
    }
};
exports.deleteUser = deleteUser;
const deleteClass = async (req, res) => {
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
        const classDoc = await Class_1.Class.findByIdAndUpdate(id, { isActive: false }, { new: true });
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
            message: "Class deactivated successfully",
            data: null,
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to delete class",
            data: null,
        });
    }
};
exports.deleteClass = deleteClass;
const createClass = async (req, res) => {
    try {
        const { title, description, teacherId, studentIds, schedule, meetingLink, sessionRateBdt, } = req.body;
        if (!title || !teacherId) {
            res.status(400).json({
                success: false,
                message: "Please provide title and teacherId",
                data: null,
            });
            return;
        }
        const teacher = await User_1.User.findOne({ _id: teacherId, role: "teacher" });
        if (!teacher) {
            res.status(400).json({
                success: false,
                message: "Teacher not found or user is not a teacher",
                data: null,
            });
            return;
        }
        const classDoc = await Class_1.Class.create({
            title,
            description,
            teacher: teacherId,
            students: studentIds || [],
            schedule,
            meetingLink,
            sessionRateBdt,
        });
        const students = studentIds || [];
        if (students.length > 0) {
            const notifications = students.map((studentId) => ({
                user: studentId,
                title: "Class Enrollment",
                message: `You have been enrolled in ${title}`,
                type: "class",
            }));
            await Notification_1.Notification.insertMany(notifications);
        }
        await (0, scheduleService_1.syncSlotsFromClass)(classDoc);
        res.status(201).json({
            success: true,
            message: "Class created successfully",
            data: classDoc,
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to create class",
            data: null,
        });
    }
};
exports.createClass = createClass;
const updateClass = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, teacherId, studentIds, schedule, meetingLink, isActive, sessionRateBdt, } = req.body;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid class ID",
                data: null,
            });
            return;
        }
        if (teacherId) {
            const teacher = await User_1.User.findOne({ _id: teacherId, role: "teacher" });
            if (!teacher) {
                res.status(400).json({
                    success: false,
                    message: "Teacher not found or user is not a teacher",
                    data: null,
                });
                return;
            }
        }
        const updateData = {};
        if (title !== undefined)
            updateData.title = title;
        if (description !== undefined)
            updateData.description = description;
        if (teacherId !== undefined)
            updateData.teacher = teacherId;
        if (studentIds !== undefined)
            updateData.students = studentIds;
        if (schedule !== undefined)
            updateData.schedule = schedule;
        if (meetingLink !== undefined)
            updateData.meetingLink = meetingLink;
        if (isActive !== undefined)
            updateData.isActive = isActive;
        if (sessionRateBdt !== undefined)
            updateData.sessionRateBdt = sessionRateBdt;
        const classDoc = await Class_1.Class.findByIdAndUpdate(id, updateData, {
            new: true,
            runValidators: true,
        })
            .populate("teacher", "name email")
            .populate("students", "name email");
        if (!classDoc) {
            res.status(404).json({
                success: false,
                message: "Class not found",
                data: null,
            });
            return;
        }
        await (0, scheduleService_1.syncSlotsFromClass)(classDoc);
        res.status(200).json({
            success: true,
            message: "Class updated successfully",
            data: classDoc,
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to update class",
            data: null,
        });
    }
};
exports.updateClass = updateClass;
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
        const classDoc = await Class_1.Class.findById(id)
            .populate("teacher", "name email")
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
const getAllClasses = async (req, res) => {
    try {
        const classes = await Class_1.Class.find()
            .populate("teacher", "name email")
            .populate("students", "name email")
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
exports.getAllClasses = getAllClasses;
const getDashboardStats = async (_req, res) => {
    try {
        const today = DAY_NAMES[new Date().getDay()];
        const [totalStudents, totalTeachers, totalClasses, activeClasses, todaysClasses,] = await Promise.all([
            User_1.User.countDocuments({ role: "student" }),
            User_1.User.countDocuments({ role: "teacher" }),
            Class_1.Class.countDocuments(),
            Class_1.Class.countDocuments({ isActive: true }),
            Class_1.Class.find({ "schedule.day": today })
                .populate("teacher", "name")
                .populate("students", "name"),
        ]);
        res.status(200).json({
            success: true,
            message: "Dashboard stats fetched successfully",
            data: {
                totalStudents,
                totalTeachers,
                totalClasses,
                activeClasses,
                todaysClasses,
            },
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch dashboard stats",
            data: null,
        });
    }
};
exports.getDashboardStats = getDashboardStats;
const getAllHomework = async (_req, res) => {
    try {
        const homework = await Homework_1.Homework.find()
            .populate("class", "title")
            .populate("teacher", "name")
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
exports.getAllHomework = getAllHomework;
const getAttendanceOverview = async (req, res) => {
    try {
        const { classId } = req.query;
        if (classId && typeof classId === "string") {
            if (!mongoose_1.default.Types.ObjectId.isValid(classId)) {
                res.status(400).json({
                    success: false,
                    message: "Invalid class ID",
                    data: null,
                });
                return;
            }
        }
        const filter = classId && typeof classId === "string" ? { class: classId } : {};
        const records = await Attendance_1.Attendance.find(filter).populate("class", "title");
        const classMap = new Map();
        for (const record of records) {
            const classDoc = record.class;
            const key = classDoc._id.toString();
            if (!classMap.has(key)) {
                classMap.set(key, {
                    class: { title: classDoc.title },
                    total: 0,
                    present: 0,
                    absent: 0,
                    late: 0,
                });
            }
            const entry = classMap.get(key);
            entry.total++;
            if (record.status === "present")
                entry.present++;
            else if (record.status === "absent")
                entry.absent++;
            else if (record.status === "late")
                entry.late++;
        }
        const overview = Array.from(classMap.values()).map((entry) => ({
            class: entry.class,
            total: entry.total,
            present: entry.present,
            absent: entry.absent,
            percentage: entry.total > 0
                ? Math.round(((entry.present + entry.late) / entry.total) * 100)
                : 0,
        }));
        res.status(200).json({
            success: true,
            message: "Attendance overview fetched successfully",
            data: overview,
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch attendance overview",
            data: null,
        });
    }
};
exports.getAttendanceOverview = getAttendanceOverview;
const getAllProgress = async (req, res) => {
    try {
        const { classId } = req.query;
        if (classId && typeof classId === "string") {
            if (!mongoose_1.default.Types.ObjectId.isValid(classId)) {
                res.status(400).json({
                    success: false,
                    message: "Invalid class ID",
                    data: null,
                });
                return;
            }
        }
        const filter = classId && typeof classId === "string" ? { class: classId } : {};
        const progress = await Progress_1.Progress.find(filter)
            .populate("student", "name email")
            .populate("class", "title")
            .populate("updatedBy", "name")
            .sort({ updatedAt: -1 });
        res.status(200).json({
            success: true,
            message: "Progress fetched successfully",
            data: progress,
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
exports.getAllProgress = getAllProgress;
const assignStudentToClass = async (req, res) => {
    try {
        const { classId } = req.params;
        const { studentId } = req.body;
        if (!mongoose_1.default.Types.ObjectId.isValid(classId)) {
            res.status(400).json({
                success: false,
                message: "Invalid class ID",
                data: null,
            });
            return;
        }
        if (!studentId) {
            res.status(400).json({
                success: false,
                message: "Please provide studentId",
                data: null,
            });
            return;
        }
        const student = await User_1.User.findOne({ _id: studentId, role: "student" });
        if (!student) {
            res.status(400).json({
                success: false,
                message: "Student not found or user is not a student",
                data: null,
            });
            return;
        }
        const classDoc = await Class_1.Class.findByIdAndUpdate(classId, { $addToSet: { students: studentId } }, { new: true })
            .populate("teacher", "name email")
            .populate("students", "name email");
        if (!classDoc) {
            res.status(404).json({
                success: false,
                message: "Class not found",
                data: null,
            });
            return;
        }
        await Notification_1.Notification.create({
            user: studentId,
            title: "Class Enrollment",
            message: `You have been enrolled in ${classDoc.title}`,
            type: "class",
        });
        res.status(200).json({
            success: true,
            message: "Student assigned to class successfully",
            data: classDoc,
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to assign student to class",
            data: null,
        });
    }
};
exports.assignStudentToClass = assignStudentToClass;
const removeStudentFromClass = async (req, res) => {
    try {
        const { classId, studentId } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(classId) ||
            !mongoose_1.default.Types.ObjectId.isValid(studentId)) {
            res.status(400).json({
                success: false,
                message: "Invalid class or student ID",
                data: null,
            });
            return;
        }
        const classDoc = await Class_1.Class.findByIdAndUpdate(classId, { $pull: { students: studentId } }, { new: true })
            .populate("teacher", "name email")
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
            message: "Student removed from class successfully",
            data: classDoc,
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to remove student from class",
            data: null,
        });
    }
};
exports.removeStudentFromClass = removeStudentFromClass;
