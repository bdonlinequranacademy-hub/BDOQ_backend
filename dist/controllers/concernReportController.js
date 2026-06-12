"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scanTextHandler = exports.updateConcernReportStatus = exports.listAdminConcernReports = exports.createConcernReport = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const ConcernReport_1 = require("../models/ConcernReport");
const notificationService_1 = require("../services/notificationService");
const complianceScanService_1 = require("../services/complianceScanService");
function formatReport(doc) {
    return {
        _id: doc._id.toString(),
        reporter: {
            _id: doc.reporter.toString(),
            name: doc.reporterName,
            role: doc.reporterRole,
        },
        category: doc.category,
        message: doc.message,
        relatedTeacherId: doc.relatedTeacher?.toString(),
        relatedStudentId: doc.relatedStudent?.toString(),
        status: doc.status,
        adminNote: doc.adminNote,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
    };
}
async function notifyAdmins(title, message) {
    await (0, notificationService_1.notifyAdmins)(title, message, "general");
}
const createConcernReport = async (req, res) => {
    try {
        const { category, message, relatedTeacherId, relatedStudentId } = req.body;
        const role = req.user.role;
        if (role !== "student" && role !== "teacher") {
            res.status(403).json({
                success: false,
                message: "Only students and teachers can submit concern reports",
                data: null,
            });
            return;
        }
        if (!message || typeof message !== "string" || message.trim().length < 10) {
            res.status(400).json({
                success: false,
                message: "Please provide a message (at least 10 characters)",
                data: null,
            });
            return;
        }
        const allowedCategories = [
            "poaching",
            "safety",
            "conduct",
            "other",
        ];
        const reportCategory = typeof category === "string" &&
            allowedCategories.includes(category)
            ? category
            : "other";
        if (relatedTeacherId && !mongoose_1.default.Types.ObjectId.isValid(relatedTeacherId)) {
            res.status(400).json({
                success: false,
                message: "Invalid related teacher ID",
                data: null,
            });
            return;
        }
        if (relatedStudentId && !mongoose_1.default.Types.ObjectId.isValid(relatedStudentId)) {
            res.status(400).json({
                success: false,
                message: "Invalid related student ID",
                data: null,
            });
            return;
        }
        const doc = await ConcernReport_1.ConcernReport.create({
            reporter: req.user._id,
            reporterRole: role,
            reporterName: req.user.name,
            category: reportCategory,
            message: message.trim(),
            relatedTeacher: relatedTeacherId || undefined,
            relatedStudent: relatedStudentId || undefined,
        });
        await notifyAdmins("New concern report", `${req.user.name} submitted a ${reportCategory} concern for review.`);
        res.status(201).json({
            success: true,
            message: "Concern report submitted. Admin will review it.",
            data: formatReport(doc),
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to submit concern report",
            data: null,
        });
    }
};
exports.createConcernReport = createConcernReport;
const listAdminConcernReports = async (req, res) => {
    try {
        const { status } = req.query;
        const filter = {};
        if (status === "new" ||
            status === "reviewed" ||
            status === "closed") {
            filter.status = status;
        }
        const docs = await ConcernReport_1.ConcernReport.find(filter).sort({ createdAt: -1 }).limit(200);
        res.status(200).json({
            success: true,
            message: "Concern reports fetched successfully",
            data: docs.map(formatReport),
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch concern reports",
            data: null,
        });
    }
};
exports.listAdminConcernReports = listAdminConcernReports;
const updateConcernReportStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, adminNote } = req.body;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid report ID",
                data: null,
            });
            return;
        }
        const allowed = ["new", "reviewed", "closed"];
        if (!status || !allowed.includes(status)) {
            res.status(400).json({
                success: false,
                message: "Invalid status",
                data: null,
            });
            return;
        }
        const doc = await ConcernReport_1.ConcernReport.findByIdAndUpdate(id, {
            status,
            ...(typeof adminNote === "string" ? { adminNote: adminNote.trim() } : {}),
        }, { new: true });
        if (!doc) {
            res.status(404).json({
                success: false,
                message: "Report not found",
                data: null,
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: "Report updated",
            data: formatReport(doc),
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to update report",
            data: null,
        });
    }
};
exports.updateConcernReportStatus = updateConcernReportStatus;
const scanTextHandler = async (req, res) => {
    try {
        const { text, context } = req.body;
        if (typeof text !== "string") {
            res.status(400).json({
                success: false,
                message: "text is required",
                data: null,
            });
            return;
        }
        const compliance = (0, complianceScanService_1.scanComplianceText)(text);
        let quality = null;
        if (context === "class_log") {
            quality = (0, complianceScanService_1.assessLogQuality)(text);
        }
        res.status(200).json({
            success: true,
            message: "Scan complete",
            data: {
                compliance,
                quality,
                warnings: [
                    ...(compliance.severity === "warn" ? [compliance.message] : []),
                    ...(quality?.severity === "warn" ? [quality.message] : []),
                ].filter(Boolean),
            },
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to scan text",
            data: null,
        });
    }
};
exports.scanTextHandler = scanTextHandler;
