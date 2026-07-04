"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyPublicCertificate = exports.previewAdminCertificate = exports.createAdminCertificate = exports.getAdminCertificate = exports.listAdminCertificates = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Certificate_1 = require("../models/Certificate");
const certificateService_1 = require("../services/certificateService");
function parseIssueDate(value) {
    if (typeof value !== "string" || !value.trim())
        return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
}
const listAdminCertificates = async (_req, res) => {
    try {
        const docs = await Certificate_1.Certificate.find()
            .sort({ createdAt: -1 })
            .limit(100);
        res.status(200).json({
            success: true,
            message: "Certificates fetched",
            data: docs.map(certificateService_1.formatCertificate),
        });
    }
    catch (err) {
        console.error("[certificate] list failed:", err);
        res.status(500).json({
            success: false,
            message: "Failed to fetch certificates",
            data: null,
        });
    }
};
exports.listAdminCertificates = listAdminCertificates;
const getAdminCertificate = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid certificate ID",
                data: null,
            });
            return;
        }
        const doc = await Certificate_1.Certificate.findById(id);
        if (!doc) {
            res.status(404).json({
                success: false,
                message: "Certificate not found",
                data: null,
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: "Certificate fetched",
            data: (0, certificateService_1.formatCertificate)(doc),
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch certificate",
            data: null,
        });
    }
};
exports.getAdminCertificate = getAdminCertificate;
const createAdminCertificate = async (req, res) => {
    try {
        const admin = req.user;
        const { studentName, studentNameBn, courseName, courseNameBn, studentPortalId, issueDate, courseDuration, grade, showExcellentBadge, performanceTextEn, performanceTextBn, } = req.body;
        if (!studentName || typeof studentName !== "string" || !studentName.trim()) {
            res.status(400).json({
                success: false,
                message: "Student name is required",
                data: null,
            });
            return;
        }
        if (!courseName || typeof courseName !== "string" || !courseName.trim()) {
            res.status(400).json({
                success: false,
                message: "Course name is required",
                data: null,
            });
            return;
        }
        if (!courseDuration || typeof courseDuration !== "string") {
            res.status(400).json({
                success: false,
                message: "Course duration is required",
                data: null,
            });
            return;
        }
        if (!grade || typeof grade !== "string") {
            res.status(400).json({
                success: false,
                message: "Grade is required",
                data: null,
            });
            return;
        }
        const parsedDate = parseIssueDate(issueDate) ?? new Date();
        const gradeStr = grade.trim();
        const badge = typeof showExcellentBadge === "boolean"
            ? showExcellentBadge
            : (0, certificateService_1.shouldShowExcellentBadge)(gradeStr);
        const certificateId = await (0, certificateService_1.generateCertificateId)();
        const doc = await Certificate_1.Certificate.create({
            certificateId,
            studentName: studentName.trim(),
            studentNameBn: typeof studentNameBn === "string" ? studentNameBn.trim() : "",
            courseName: courseName.trim(),
            courseNameBn: typeof courseNameBn === "string" ? courseNameBn.trim() : "",
            studentPortalId: typeof studentPortalId === "string" ? studentPortalId.trim() : "",
            issueDate: parsedDate,
            courseDuration: courseDuration.trim(),
            grade: gradeStr,
            showExcellentBadge: badge,
            performanceTextEn: typeof performanceTextEn === "string" && performanceTextEn.trim()
                ? performanceTextEn.trim()
                : certificateService_1.DEFAULT_PERFORMANCE_EN,
            performanceTextBn: typeof performanceTextBn === "string" && performanceTextBn.trim()
                ? performanceTextBn.trim()
                : certificateService_1.DEFAULT_PERFORMANCE_BN,
            issuedBy: admin._id,
        });
        res.status(201).json({
            success: true,
            message: "Certificate created",
            data: (0, certificateService_1.formatCertificate)(doc),
        });
    }
    catch (err) {
        console.error("[certificate] create failed:", err);
        res.status(500).json({
            success: false,
            message: "Failed to create certificate",
            data: null,
        });
    }
};
exports.createAdminCertificate = createAdminCertificate;
const previewAdminCertificate = async (req, res) => {
    try {
        const admin = req.user;
        const { studentName, studentNameBn, courseName, courseNameBn, studentPortalId, issueDate, courseDuration, grade, showExcellentBadge, performanceTextEn, performanceTextBn, certificateId, } = req.body;
        if (!studentName?.trim() || !courseName?.trim()) {
            res.status(400).json({
                success: false,
                message: "Student name and course name are required for preview",
                data: null,
            });
            return;
        }
        const gradeStr = String(grade || "Excellent (A+)").trim();
        const certId = typeof certificateId === "string" && certificateId.trim()
            ? certificateId.trim().toUpperCase()
            : `BDOQ-${new Date().getFullYear()}-PREVIEW`;
        const parsedDate = parseIssueDate(issueDate) ?? new Date();
        const badge = typeof showExcellentBadge === "boolean"
            ? showExcellentBadge
            : (0, certificateService_1.shouldShowExcellentBadge)(gradeStr);
        const preview = (0, certificateService_1.formatCertificate)({
            _id: new mongoose_1.default.Types.ObjectId(),
            certificateId: certId,
            studentName: studentName.trim(),
            studentNameBn: typeof studentNameBn === "string" ? studentNameBn.trim() : "",
            courseName: courseName.trim(),
            courseNameBn: typeof courseNameBn === "string" ? courseNameBn.trim() : "",
            studentPortalId: typeof studentPortalId === "string" ? studentPortalId.trim() : "",
            issueDate: parsedDate,
            courseDuration: String(courseDuration || "3 Months").trim(),
            grade: gradeStr,
            showExcellentBadge: badge,
            performanceTextEn: typeof performanceTextEn === "string" && performanceTextEn.trim()
                ? performanceTextEn.trim()
                : certificateService_1.DEFAULT_PERFORMANCE_EN,
            performanceTextBn: typeof performanceTextBn === "string" && performanceTextBn.trim()
                ? performanceTextBn.trim()
                : certificateService_1.DEFAULT_PERFORMANCE_BN,
            issuedBy: admin._id,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        res.status(200).json({
            success: true,
            message: "Preview generated",
            data: preview,
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to generate preview",
            data: null,
        });
    }
};
exports.previewAdminCertificate = previewAdminCertificate;
const verifyPublicCertificate = async (req, res) => {
    try {
        const rawId = req.params.certificateId;
        if (!rawId?.trim()) {
            res.status(400).json({
                success: false,
                message: "Certificate ID is required",
                data: null,
            });
            return;
        }
        const certificateId = decodeURIComponent(rawId).trim().toUpperCase();
        const doc = await Certificate_1.Certificate.findOne({ certificateId });
        if (!doc) {
            res.status(404).json({
                success: false,
                message: "Certificate not found or invalid",
                data: null,
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: "Certificate verified",
            data: {
                valid: true,
                ...(0, certificateService_1.formatCertificate)(doc),
            },
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Verification failed",
            data: null,
        });
    }
};
exports.verifyPublicCertificate = verifyPublicCertificate;
