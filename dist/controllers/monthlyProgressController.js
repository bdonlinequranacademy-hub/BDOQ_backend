"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTeacherMonthlyProgressById = exports.listAdminMonthlyProgressHandler = exports.listStudentMonthlyProgressHandler = exports.listTeacherMonthlyProgressHandler = exports.createTeacherMonthlyProgress = exports.getMonthlyQuestions = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const monthlyProgressService_1 = require("../services/monthlyProgressService");
function currentMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}
function parseMonth(value) {
    if (typeof value === "string" && /^\d{4}-\d{2}$/.test(value)) {
        return value;
    }
    return undefined;
}
const getMonthlyQuestions = async (_req, res) => {
    res.status(200).json({
        success: true,
        message: "Monthly progress questions fetched",
        data: (0, monthlyProgressService_1.getDefaultMonthlyQuestions)(),
    });
};
exports.getMonthlyQuestions = getMonthlyQuestions;
const createTeacherMonthlyProgress = async (req, res) => {
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
        const snapshot = await (0, monthlyProgressService_1.upsertMonthlyProgress)({
            teacherId: req.user._id,
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
    }
    catch (err) {
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
exports.createTeacherMonthlyProgress = createTeacherMonthlyProgress;
const listTeacherMonthlyProgressHandler = async (req, res) => {
    try {
        const month = parseMonth(req.query.month);
        const data = await (0, monthlyProgressService_1.listTeacherMonthlyProgress)(req.user._id, month);
        res.status(200).json({
            success: true,
            message: "Monthly progress fetched successfully",
            data,
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch monthly progress",
            data: null,
        });
    }
};
exports.listTeacherMonthlyProgressHandler = listTeacherMonthlyProgressHandler;
const listStudentMonthlyProgressHandler = async (req, res) => {
    try {
        const month = parseMonth(req.query.month);
        const data = await (0, monthlyProgressService_1.listStudentMonthlyProgress)(req.user._id, month);
        res.status(200).json({
            success: true,
            message: "Monthly progress fetched successfully",
            data,
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch monthly progress",
            data: null,
        });
    }
};
exports.listStudentMonthlyProgressHandler = listStudentMonthlyProgressHandler;
const listAdminMonthlyProgressHandler = async (req, res) => {
    try {
        const month = parseMonth(req.query.month);
        const data = await (0, monthlyProgressService_1.listAdminMonthlyProgress)(month);
        res.status(200).json({
            success: true,
            message: "Monthly progress fetched successfully",
            data,
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch monthly progress",
            data: null,
        });
    }
};
exports.listAdminMonthlyProgressHandler = listAdminMonthlyProgressHandler;
const getTeacherMonthlyProgressById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid snapshot ID",
                data: null,
            });
            return;
        }
        const month = parseMonth(req.query.month);
        const data = await (0, monthlyProgressService_1.listTeacherMonthlyProgress)(req.user._id, month);
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
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch monthly progress",
            data: null,
        });
    }
};
exports.getTeacherMonthlyProgressById = getTeacherMonthlyProgressById;
