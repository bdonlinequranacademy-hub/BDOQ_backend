"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeStudentFromClass = exports.assignStudentToClass = exports.getAllProgress = exports.getAttendanceOverview = exports.deleteAdminHomework = exports.getAllHomework = exports.getDashboardStats = exports.getAllClasses = exports.getClassById = exports.updateClass = exports.createClass = exports.deleteClass = exports.deleteUser = exports.updateUser = exports.createUser = exports.getUserById = exports.getAllUsers = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const mongoose_1 = __importDefault(require("mongoose"));
const User_1 = require("../models/User");
const Class_1 = require("../models/Class");
const Homework_1 = require("../models/Homework");
const Attendance_1 = require("../models/Attendance");
const Progress_1 = require("../models/Progress");
const notificationService_1 = require("../services/notificationService");
const ClassLog_1 = require("../models/ClassLog");
const TrialBooking_1 = require("../models/TrialBooking");
const ContactMessage_1 = require("../models/ContactMessage");
const StudentRequest_1 = require("../models/StudentRequest");
const StudentAdmissionApplication_1 = require("../models/StudentAdmissionApplication");
const TeacherApplication_1 = require("../models/TeacherApplication");
const paymentReminderService_1 = require("../services/paymentReminderService");
const studentId_1 = require("../utils/studentId");
const whatsappPhone_1 = require("../lib/whatsappPhone");
const scheduleService_1 = require("../services/scheduleService");
const meetingLink_1 = require("../utils/meetingLink");
const scheduleUtils_1 = require("../utils/scheduleUtils");
const curriculumService_1 = require("../services/curriculumService");
const liveMonitorService_1 = require("../services/liveMonitorService");
const adminRoles_1 = require("../lib/adminRoles");
const DAY_NAMES = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
];
const ASSIGNABLE_ROLES = ["student", "teacher", "admin", "super_admin"];
const getActor = (req) => req.user;
const formatUser = (user) => ({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role === "parent" ? "student" : user.role,
    isActive: user.isActive,
    children: user.children?.map((id) => id.toString()) ?? [],
    studentId: user.studentId ?? undefined,
    gender: user.gender ?? undefined,
    timezone: user.timezone ?? "Asia/Dhaka",
    country: user.country ?? undefined,
    whatsapp: user.whatsapp ?? undefined,
    curriculumAssignments: user.curriculumAssignments ?? [],
    createdAt: user.createdAt,
});
const getAllUsers = async (req, res) => {
    try {
        const actor = getActor(req);
        const { role, gender } = req.query;
        const filter = { ...(0, adminRoles_1.usersListFilterFor)(actor) };
        if (role) {
            if (role === "parent") {
                res.status(400).json({
                    success: false,
                    message: "Parent role is no longer used. Use student.",
                    data: null,
                });
                return;
            }
            if (role === "super_admin" && !(0, adminRoles_1.isSuperAdmin)(actor.role)) {
                res.status(403).json({
                    success: false,
                    message: "Only the super admin can filter super admin accounts",
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
        if (gender === "male" || gender === "female") {
            filter.gender = gender;
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
        const actor = getActor(req);
        if (!(0, adminRoles_1.canManageUser)(actor, user) && user.role !== actor.role) {
            res.status(403).json({
                success: false,
                message: "You cannot view this user account",
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
        const actor = getActor(req);
        const { name, email, password, role, gender, timezone, country, curriculumAssignments, whatsapp } = req.body;
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
        const assignRole = (role || "student");
        if (assignRole === "super_admin") {
            res.status(403).json({
                success: false,
                message: "Super admin accounts cannot be created from the portal",
                data: null,
            });
            return;
        }
        if (!(0, adminRoles_1.canAssignRole)(actor, assignRole)) {
            res.status(403).json({
                success: false,
                message: "You are not allowed to create this role",
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
        const userPayload = {
            name,
            email,
            password: hashedPassword,
            role: assignRole,
            emailVerified: true,
        };
        if (assignRole === "student" || assignRole === "teacher") {
            if (typeof country !== "string" || !country.trim()) {
                res.status(400).json({
                    success: false,
                    message: "Country is required for students and teachers",
                    data: null,
                });
                return;
            }
            userPayload.country = country.trim();
        }
        if (assignRole === "student") {
            userPayload.studentId = await (0, studentId_1.generateStudentId)();
            userPayload.timezone =
                typeof timezone === "string" && timezone.trim()
                    ? timezone.trim()
                    : "Asia/Dhaka";
            const parsedCurriculum = (0, curriculumService_1.parseCurriculumAssignments)(curriculumAssignments);
            if (parsedCurriculum) {
                userPayload.curriculumAssignments = parsedCurriculum;
            }
        }
        if (assignRole === "teacher" && gender) {
            if (gender !== "male" && gender !== "female") {
                res.status(400).json({
                    success: false,
                    message: "Teacher gender must be male or female",
                    data: null,
                });
                return;
            }
            userPayload.gender = gender;
        }
        if (whatsapp !== undefined &&
            (assignRole === "student" || assignRole === "teacher" || assignRole === "admin")) {
            const countryHint = typeof country === "string" ? country.trim() : undefined;
            const normalized = (0, whatsappPhone_1.normalizeWhatsAppForStorage)(whatsapp, countryHint);
            if (!normalized.ok) {
                res.status(400).json({
                    success: false,
                    message: normalized.error,
                    data: null,
                });
                return;
            }
            if (normalized.whatsapp) {
                userPayload.whatsapp = normalized.whatsapp;
            }
        }
        const user = await User_1.User.create(userPayload);
        res.status(201).json({
            success: true,
            message: "User created successfully",
            data: formatUser(user),
        });
    }
    catch (err) {
        console.error("[admin] createUser failed:", err);
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
        const actor = getActor(req);
        const { id } = req.params;
        const { name, email, role, isActive, children, gender, timezone, country, curriculumAssignments, whatsapp } = req.body;
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
        if (role === "super_admin") {
            res.status(403).json({
                success: false,
                message: "Super admin role cannot be assigned from the portal",
                data: null,
            });
            return;
        }
        const target = await User_1.User.findById(id);
        if (!target) {
            res.status(404).json({
                success: false,
                message: "User not found",
                data: null,
            });
            return;
        }
        if (!(0, adminRoles_1.canManageUser)(actor, target)) {
            res.status(403).json({
                success: false,
                message: "You are not allowed to update this user",
                data: null,
            });
            return;
        }
        if (role !== undefined && !(0, adminRoles_1.canAssignRole)(actor, role)) {
            res.status(403).json({
                success: false,
                message: "You are not allowed to assign this role",
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
        const unsetData = {};
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
        if (gender !== undefined) {
            if (gender === null || gender === "") {
                unsetData.gender = 1;
            }
            else if (gender === "male" || gender === "female") {
                updateData.gender = gender;
            }
            else {
                res.status(400).json({
                    success: false,
                    message: "Gender must be male or female",
                    data: null,
                });
                return;
            }
        }
        if (timezone !== undefined) {
            updateData.timezone =
                typeof timezone === "string" && timezone.trim()
                    ? timezone.trim()
                    : "Asia/Dhaka";
        }
        if (country !== undefined) {
            const trimmed = typeof country === "string" ? country.trim() : "";
            const targetRole = role;
            if (!trimmed &&
                (targetRole === "student" || targetRole === "teacher")) {
                res.status(400).json({
                    success: false,
                    message: "Country is required for students and teachers",
                    data: null,
                });
                return;
            }
            updateData.country = trimmed;
        }
        if (curriculumAssignments !== undefined) {
            const parsed = (0, curriculumService_1.parseCurriculumAssignments)(curriculumAssignments);
            if (parsed === null) {
                res.status(400).json({
                    success: false,
                    message: "curriculumAssignments must be an array",
                    data: null,
                });
                return;
            }
            updateData.curriculumAssignments = parsed;
        }
        if (whatsapp !== undefined) {
            const countryHint = typeof country === "string"
                ? country.trim()
                : target.country?.trim();
            const normalized = (0, whatsappPhone_1.normalizeWhatsAppForStorage)(whatsapp, countryHint);
            if (!normalized.ok) {
                res.status(400).json({
                    success: false,
                    message: normalized.error,
                    data: null,
                });
                return;
            }
            updateData.whatsapp = normalized.whatsapp;
        }
        const mongoUpdate = { ...updateData };
        if (Object.keys(unsetData).length > 0) {
            mongoUpdate.$unset = unsetData;
        }
        const user = await User_1.User.findByIdAndUpdate(id, mongoUpdate, {
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
        const actor = getActor(req);
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid user ID",
                data: null,
            });
            return;
        }
        const target = await User_1.User.findById(id);
        if (!target) {
            res.status(404).json({
                success: false,
                message: "User not found",
                data: null,
            });
            return;
        }
        if (!(0, adminRoles_1.canManageUser)(actor, target)) {
            res.status(403).json({
                success: false,
                message: "You are not allowed to deactivate this user",
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
        await (0, scheduleService_1.syncSlotsFromClass)(classDoc);
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
        const parsedSchedule = (0, scheduleUtils_1.parseClassSchedule)(schedule);
        if (!parsedSchedule) {
            res.status(400).json({
                success: false,
                message: "Schedule must include a valid weekday and time in 24-hour format (e.g. 09:00, Bangladesh time).",
                data: null,
            });
            return;
        }
        const classDoc = await Class_1.Class.create({
            title,
            description: typeof description === "string" && description.trim()
                ? description.trim()
                : undefined,
            teacher: teacherId,
            students: studentIds || [],
            schedule: parsedSchedule,
            meetingLink: (0, meetingLink_1.normalizeMeetingLink)(meetingLink),
            sessionRateBdt,
        });
        const students = studentIds || [];
        await (0, notificationService_1.createUserNotification)({
            userId: teacherId,
            title: "New class assigned",
            message: `You have been assigned to teach "${title}". Check My Classes for schedule and students.`,
            type: "class",
        });
        if (students.length > 0) {
            await (0, notificationService_1.createUserNotifications)(students.map((studentId) => ({
                userId: studentId,
                title: "Class Enrollment",
                message: `You have been enrolled in ${title}`,
                type: "class",
            })));
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
        if (schedule !== undefined) {
            const parsedSchedule = (0, scheduleUtils_1.parseClassSchedule)(schedule);
            if (!parsedSchedule) {
                res.status(400).json({
                    success: false,
                    message: "Schedule must include a valid weekday and time in 24-hour format (e.g. 09:00, Bangladesh time).",
                    data: null,
                });
                return;
            }
            updateData.schedule = parsedSchedule;
        }
        if (meetingLink !== undefined) {
            updateData.meetingLink = (0, meetingLink_1.normalizeMeetingLink)(meetingLink);
        }
        if (isActive !== undefined)
            updateData.isActive = isActive;
        if (sessionRateBdt !== undefined)
            updateData.sessionRateBdt = sessionRateBdt;
        const previousClass = await Class_1.Class.findById(id).select("teacher title");
        const classDoc = await Class_1.Class.findByIdAndUpdate(id, updateData, {
            new: true,
            runValidators: true,
        })
            .populate("teacher", "name email")
            .populate("students", "name email country studentId timezone");
        if (!classDoc) {
            res.status(404).json({
                success: false,
                message: "Class not found",
                data: null,
            });
            return;
        }
        await (0, scheduleService_1.syncSlotsFromClass)(classDoc);
        if (teacherId &&
            previousClass &&
            previousClass.teacher.toString() !== String(teacherId)) {
            await (0, notificationService_1.createUserNotification)({
                userId: teacherId,
                title: "Class assigned to you",
                message: `You are now the teacher for "${classDoc.title}".`,
                type: "class",
            });
        }
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
            .populate("students", "name email country studentId timezone");
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
        const [totalStudents, totalTeachers, totalClasses, activeClasses, liveMonitor, newTrials, newContacts, newStudentAdmissions, newTeacherApplications, pendingClassLogs, pendingPayments, pendingStudentRequests, studentsWithPrograms, progressMissingProgram, logsMissingProgram,] = await Promise.all([
            User_1.User.countDocuments({ role: "student" }),
            User_1.User.countDocuments({ role: "teacher" }),
            Class_1.Class.countDocuments(),
            Class_1.Class.countDocuments({ isActive: true }),
            (0, liveMonitorService_1.getLiveMonitorPayload)(),
            TrialBooking_1.TrialBooking.countDocuments({ status: "new" }),
            ContactMessage_1.ContactMessage.countDocuments({ status: "new" }),
            StudentAdmissionApplication_1.StudentAdmissionApplication.countDocuments({ status: "new" }),
            TeacherApplication_1.TeacherApplication.countDocuments({ status: "new" }),
            ClassLog_1.ClassLog.countDocuments({ status: "pending" }),
            (0, paymentReminderService_1.countPendingPayments)(),
            StudentRequest_1.StudentRequest.countDocuments({ status: "pending" }),
            User_1.User.countDocuments({
                role: "student",
                "curriculumAssignments.0": { $exists: true },
            }),
            Progress_1.Progress.countDocuments({
                $or: [
                    { curriculumProgram: { $exists: false } },
                    { curriculumProgram: null },
                    { curriculumProgram: "" },
                ],
            }),
            ClassLog_1.ClassLog.countDocuments({
                $or: [
                    { curriculumProgram: { $exists: false } },
                    { curriculumProgram: null },
                    { curriculumProgram: "" },
                ],
            }),
        ]);
        const todaysSessions = liveMonitor.sessions.slice(0, 12).map((s) => ({
            _id: s._id,
            classId: s.classId,
            classTitle: s.classTitle,
            teacherName: s.teacher.name,
            studentName: s.student.name,
            startTimeLabel: s.startTimeLabel,
            sessionPhase: s.sessionPhase,
            startsAt: s.startsAt,
            meetingLink: s.meetingLink,
            teacherJoined: Boolean(s.joins.teacherJoinedAt),
            studentJoined: Boolean(s.joins.studentJoinedAt),
            alerts: s.alerts,
        }));
        res.status(200).json({
            success: true,
            message: "Dashboard stats fetched successfully",
            data: {
                totalStudents,
                totalTeachers,
                totalClasses,
                activeClasses,
                todaysClasses: todaysSessions,
                liveSummary: liveMonitor.summary,
                pendingActions: {
                    newTrials,
                    newContacts,
                    newStudentAdmissions,
                    newTeacherApplications,
                    pendingClassLogs,
                    pendingPayments,
                    pendingStudentRequests,
                },
                curriculumCoverage: {
                    studentsWithPrograms,
                    totalStudents,
                    progressMissingProgram,
                    logsMissingProgram,
                },
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
            .populate("class", "title students")
            .populate("teacher", "name")
            .sort({ dueDate: -1 });
        const homeworkWithCounts = homework.map((hw) => {
            const classDoc = hw.class;
            const teacherDoc = hw.teacher;
            const totalStudents = classDoc?.students?.length ?? 0;
            const gradedCount = hw.submissions.filter((s) => s.grade).length;
            const pendingGradeCount = hw.submissions.filter((s) => s.submittedAt && !s.grade).length;
            return {
                _id: hw._id,
                title: hw.title,
                description: hw.description,
                class: classDoc,
                teacher: teacherDoc,
                dueDate: hw.dueDate,
                curriculumProgram: hw.curriculumProgram,
                curriculumUnit: hw.curriculumUnit,
                curriculumTopic: hw.curriculumTopic,
                curriculumLabels: (0, curriculumService_1.resolveCurriculumLabels)(hw.curriculumProgram, hw.curriculumUnit, hw.curriculumTopic),
                submissionCount: hw.submissions.filter((s) => s.submittedAt).length,
                totalStudents,
                gradedCount,
                pendingGradeCount,
                createdAt: hw.createdAt,
                updatedAt: hw.updatedAt,
            };
        });
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
const deleteAdminHomework = async (req, res) => {
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
        const homework = await Homework_1.Homework.findById(id);
        if (!homework) {
            res.status(404).json({
                success: false,
                message: "Homework not found",
                data: null,
            });
            return;
        }
        await homework.deleteOne();
        res.status(200).json({
            success: true,
            message: "Homework deleted successfully",
            data: { homeworkId: id },
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to delete homework",
            data: null,
        });
    }
};
exports.deleteAdminHomework = deleteAdminHomework;
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
            .populate("students", "name email country studentId timezone");
        if (!classDoc) {
            res.status(404).json({
                success: false,
                message: "Class not found",
                data: null,
            });
            return;
        }
        await (0, notificationService_1.createUserNotification)({
            userId: studentId,
            title: "Class Enrollment",
            message: `You have been enrolled in ${classDoc.title}`,
            type: "class",
        });
        const teacherRef = classDoc.teacher;
        const teacherUserId = typeof teacherRef === "object" && teacherRef !== null && "_id" in teacherRef
            ? teacherRef._id
            : teacherRef;
        await (0, notificationService_1.createUserNotification)({
            userId: teacherUserId,
            title: "New student in your class",
            message: `${student.name} was enrolled in "${classDoc.title}".`,
            type: "class",
        });
        const classForSync = await Class_1.Class.findById(classId);
        if (classForSync) {
            await (0, scheduleService_1.syncSlotsFromClass)(classForSync);
        }
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
            .populate("students", "name email country studentId timezone");
        if (!classDoc) {
            res.status(404).json({
                success: false,
                message: "Class not found",
                data: null,
            });
            return;
        }
        const classForSync = await Class_1.Class.findById(classId);
        if (classForSync) {
            await (0, scheduleService_1.syncSlotsFromClass)(classForSync);
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
