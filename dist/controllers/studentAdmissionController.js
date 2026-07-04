"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.patchAdminStudentAdmissionStatus = exports.listAdminStudentAdmissions = exports.submitStudentAdmission = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const studentAdmissionService_1 = require("../services/studentAdmissionService");
function parseLocale(value) {
    if (value === "en" || value === "bn")
        return value;
    return undefined;
}
function parseStatus(value) {
    if (value === "new" ||
        value === "reviewing" ||
        value === "approved" ||
        value === "closed") {
        return value;
    }
    return undefined;
}
const submitStudentAdmission = async (req, res) => {
    try {
        const body = req.body ?? {};
        const fullName = typeof body.fullName === "string"
            ? body.fullName
            : typeof body.name === "string"
                ? body.name
                : "";
        const result = await (0, studentAdmissionService_1.createStudentAdmissionApplication)({
            fullName,
            email: body.email,
            whatsapp: body.whatsapp,
            formData: body,
            locale: parseLocale(body.locale),
        });
        if ("error" in result) {
            res.status(400).json({ success: false, message: result.error, data: null });
            return;
        }
        const { application } = result;
        res.status(201).json({
            success: true,
            message: "Admission application received. We will contact you within 24–48 hours.",
            data: { id: application._id, status: application.status },
        });
    }
    catch (err) {
        console.error("[admission] submit failed:", err);
        res.status(500).json({
            success: false,
            message: "Failed to submit admission application",
            data: null,
        });
    }
};
exports.submitStudentAdmission = submitStudentAdmission;
const listAdminStudentAdmissions = async (req, res) => {
    try {
        const status = parseStatus(req.query.status);
        if (req.query.status && !status) {
            res.status(400).json({
                success: false,
                message: "Invalid status filter",
                data: null,
            });
            return;
        }
        const data = await (0, studentAdmissionService_1.listStudentAdmissionApplications)(status);
        res.status(200).json({
            success: true,
            message: "Student admission applications fetched",
            data,
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch admission applications",
            data: null,
        });
    }
};
exports.listAdminStudentAdmissions = listAdminStudentAdmissions;
const patchAdminStudentAdmissionStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const status = parseStatus(req.body.status);
        const adminNote = typeof req.body.adminNote === "string" ? req.body.adminNote : undefined;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid application ID",
                data: null,
            });
            return;
        }
        if (!status) {
            res.status(400).json({
                success: false,
                message: "status must be new, reviewing, approved, or closed",
                data: null,
            });
            return;
        }
        const result = await (0, studentAdmissionService_1.updateStudentAdmissionStatus)(id, status, adminNote);
        if ("error" in result) {
            res.status(404).json({ success: false, message: result.error, data: null });
            return;
        }
        res.status(200).json({
            success: true,
            message: "Admission application updated",
            data: result.application,
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to update admission application",
            data: null,
        });
    }
};
exports.patchAdminStudentAdmissionStatus = patchAdminStudentAdmissionStatus;
