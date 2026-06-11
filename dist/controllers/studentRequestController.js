"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rejectStudentRequest = exports.approveStudentRequest = exports.listAdminStudentRequestsHandler = exports.listTeacherStudentRequestsHandler = exports.createTeacherStudentRequest = void 0;
const studentRequestService_1 = require("../services/studentRequestService");
function parseStatus(value) {
    if (value === "pending" || value === "approved" || value === "rejected") {
        return value;
    }
    return undefined;
}
const createTeacherStudentRequest = async (req, res) => {
    try {
        const { message, preferredCourseType } = req.body;
        if (!message?.trim()) {
            res.status(400).json({
                success: false,
                message: "message is required",
                data: null,
            });
            return;
        }
        const data = await (0, studentRequestService_1.createStudentRequest)(req.user._id, message, preferredCourseType);
        res.status(201).json({
            success: true,
            message: "Request submitted to admin",
            data,
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to submit request",
            data: null,
        });
    }
};
exports.createTeacherStudentRequest = createTeacherStudentRequest;
const listTeacherStudentRequestsHandler = async (req, res) => {
    try {
        const data = await (0, studentRequestService_1.listTeacherStudentRequests)(req.user._id);
        res.status(200).json({
            success: true,
            message: "Requests fetched successfully",
            data,
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch requests",
            data: null,
        });
    }
};
exports.listTeacherStudentRequestsHandler = listTeacherStudentRequestsHandler;
const listAdminStudentRequestsHandler = async (req, res) => {
    try {
        const status = parseStatus(req.query.status);
        const data = await (0, studentRequestService_1.listAdminStudentRequests)(status);
        res.status(200).json({
            success: true,
            message: "Requests fetched successfully",
            data,
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch requests",
            data: null,
        });
    }
};
exports.listAdminStudentRequestsHandler = listAdminStudentRequestsHandler;
const approveStudentRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { adminNote } = req.body;
        const data = await (0, studentRequestService_1.resolveStudentRequest)(id, req.user._id, "approved", adminNote);
        if (!data) {
            res.status(404).json({
                success: false,
                message: "Request not found",
                data: null,
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: "Request approved",
            data,
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to approve request",
            data: null,
        });
    }
};
exports.approveStudentRequest = approveStudentRequest;
const rejectStudentRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { adminNote } = req.body;
        const data = await (0, studentRequestService_1.resolveStudentRequest)(id, req.user._id, "rejected", adminNote);
        if (!data) {
            res.status(404).json({
                success: false,
                message: "Request not found",
                data: null,
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: "Request rejected",
            data,
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to reject request",
            data: null,
        });
    }
};
exports.rejectStudentRequest = rejectStudentRequest;
