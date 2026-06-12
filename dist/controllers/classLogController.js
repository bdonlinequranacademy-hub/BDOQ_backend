"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rejectAdminClassLog = exports.approveAdminClassLog = exports.listAdminClassLogs = exports.getTeacherClassLogStats = exports.getTeacherClassLog = exports.listTeacherClassLogs = exports.createTeacherClassLog = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const classLogService_1 = require("../services/classLogService");
const ClassLog_1 = require("../models/ClassLog");
const complianceScanService_1 = require("../services/complianceScanService");
const SessionSlot_1 = require("../models/SessionSlot");
const curriculumService_1 = require("../services/curriculumService");
function parseStatus(value) {
    if (value === "pending" || value === "approved" || value === "rejected") {
        return value;
    }
    return undefined;
}
const createTeacherClassLog = async (req, res) => {
    try {
        const { sessionSlotId, sessionDate, lessonReport, topicsCovered, curriculumProgram, curriculumUnit, curriculumTopic, } = req.body;
        if (!sessionSlotId || !lessonReport?.trim() || !curriculumProgram) {
            res.status(400).json({
                success: false,
                message: "sessionSlotId, curriculumProgram, and lessonReport are required",
                data: null,
            });
            return;
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(sessionSlotId)) {
            res.status(400).json({
                success: false,
                message: "Invalid session slot ID",
                data: null,
            });
            return;
        }
        const date = typeof sessionDate === "string" && sessionDate
            ? sessionDate
            : new Date().toISOString().split("T")[0];
        const trimmedReport = String(lessonReport).trim();
        const compliance = (0, complianceScanService_1.scanComplianceText)(trimmedReport);
        if (!compliance.passed) {
            res.status(400).json({
                success: false,
                message: compliance.message,
                data: { compliance },
            });
            return;
        }
        const previous = await ClassLog_1.ClassLog.findOne({
            sessionSlot: sessionSlotId,
            teacher: req.user._id,
        })
            .sort({ createdAt: -1 })
            .select("lessonReport");
        const quality = (0, complianceScanService_1.assessLogQuality)(trimmedReport, {
            previousReport: previous?.lessonReport ?? null,
        });
        if (!quality.passed) {
            res.status(400).json({
                success: false,
                message: quality.message,
                data: { quality },
            });
            return;
        }
        const warnings = (0, complianceScanService_1.combineScanWarnings)(compliance, quality);
        const slot = await SessionSlot_1.SessionSlot.findOne({
            _id: sessionSlotId,
            teacher: req.user._id,
            isActive: true,
        }).select("student");
        if (!slot) {
            res.status(404).json({
                success: false,
                message: "Session slot not found",
                data: null,
            });
            return;
        }
        const curriculumOk = await (0, curriculumService_1.validateCurriculumForStudent)(slot.student.toString(), curriculumProgram, curriculumUnit, curriculumTopic);
        if (!curriculumOk) {
            res.status(400).json({
                success: false,
                message: "Invalid curriculum selection for this student",
                data: null,
            });
            return;
        }
        const log = await (0, classLogService_1.createClassLog)({
            teacherId: req.user._id,
            sessionSlotId,
            sessionDate: date,
            lessonReport: trimmedReport,
            topicsCovered: Array.isArray(topicsCovered) ? topicsCovered : undefined,
            curriculumProgram,
            curriculumUnit,
            curriculumTopic,
        });
        res.status(201).json({
            success: true,
            message: "Class log submitted for approval",
            data: log,
            warnings: warnings.length > 0 ? warnings : undefined,
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "";
        if (message === "SESSION_SLOT_NOT_FOUND") {
            res.status(404).json({
                success: false,
                message: "Session slot not found",
                data: null,
            });
            return;
        }
        if (message === "LOG_ALREADY_EXISTS") {
            res.status(409).json({
                success: false,
                message: "A log for this session on this date already exists",
                data: null,
            });
            return;
        }
        res.status(500).json({
            success: false,
            message: "Failed to create class log",
            data: null,
        });
    }
};
exports.createTeacherClassLog = createTeacherClassLog;
const listTeacherClassLogs = async (req, res) => {
    try {
        const status = parseStatus(req.query.status);
        const logs = await (0, classLogService_1.getTeacherClassLogs)(req.user._id, status);
        res.status(200).json({
            success: true,
            message: "Class logs fetched successfully",
            data: logs,
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch class logs",
            data: null,
        });
    }
};
exports.listTeacherClassLogs = listTeacherClassLogs;
const getTeacherClassLog = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid class log ID",
                data: null,
            });
            return;
        }
        const log = await (0, classLogService_1.getTeacherClassLogById)(req.user._id, id);
        if (!log) {
            res.status(404).json({
                success: false,
                message: "Class log not found",
                data: null,
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: "Class log fetched successfully",
            data: log,
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch class log",
            data: null,
        });
    }
};
exports.getTeacherClassLog = getTeacherClassLog;
const getTeacherClassLogStats = async (req, res) => {
    try {
        const stats = await (0, classLogService_1.getTeacherLogStats)(req.user._id);
        res.status(200).json({
            success: true,
            message: "Class log stats fetched successfully",
            data: stats,
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch class log stats",
            data: null,
        });
    }
};
exports.getTeacherClassLogStats = getTeacherClassLogStats;
const listAdminClassLogs = async (req, res) => {
    try {
        const status = parseStatus(req.query.status);
        const logs = await (0, classLogService_1.getAdminClassLogs)(status);
        res.status(200).json({
            success: true,
            message: "Class logs fetched successfully",
            data: logs,
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch class logs",
            data: null,
        });
    }
};
exports.listAdminClassLogs = listAdminClassLogs;
const approveAdminClassLog = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid class log ID",
                data: null,
            });
            return;
        }
        const log = await (0, classLogService_1.approveClassLog)(id, req.user._id);
        if (!log) {
            res.status(404).json({
                success: false,
                message: "Class log not found",
                data: null,
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: "Class log approved",
            data: log,
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to approve class log",
            data: null,
        });
    }
};
exports.approveAdminClassLog = approveAdminClassLog;
const rejectAdminClassLog = async (req, res) => {
    try {
        const { id } = req.params;
        const { adminNote } = req.body;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid class log ID",
                data: null,
            });
            return;
        }
        const log = await (0, classLogService_1.rejectClassLog)(id, req.user._id, adminNote);
        if (!log) {
            res.status(404).json({
                success: false,
                message: "Class log not found",
                data: null,
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: "Class log rejected",
            data: log,
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to reject class log",
            data: null,
        });
    }
};
exports.rejectAdminClassLog = rejectAdminClassLog;
