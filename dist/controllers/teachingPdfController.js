"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.proxyTeachingPdf = exports.deleteTeachingPdf = exports.updateTeachingPdf = exports.createTeachingPdf = exports.getTeachingPdfById = exports.listTeachingPdfs = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const TeachingPdf_1 = require("../models/TeachingPdf");
const adminRoles_1 = require("../lib/adminRoles");
const MAX_PDF_BYTES = 25 * 1024 * 1024;
const PROXY_TIMEOUT_MS = 30000;
function formatTeachingPdf(doc) {
    const creator = typeof doc.createdBy === "object" && doc.createdBy !== null && "name" in doc.createdBy
        ? doc.createdBy
        : null;
    return {
        id: doc._id.toString(),
        name: doc.name,
        url: doc.url,
        notes: doc.notes,
        sortOrder: doc.sortOrder,
        createdBy: creator
            ? { id: creator._id.toString(), name: creator.name ?? "Staff" }
            : {
                id: doc.createdBy instanceof mongoose_1.default.Types.ObjectId
                    ? doc.createdBy.toString()
                    : String(doc.createdBy),
                name: "Staff",
            },
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
    };
}
function isValidHttpUrl(value) {
    try {
        const parsed = new URL(value);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
    }
    catch {
        return false;
    }
}
function canManagePdf(userId, userRole, doc) {
    if ((0, adminRoles_1.isStaffAdmin)(userRole))
        return true;
    return doc.createdBy.toString() === userId;
}
const listTeachingPdfs = async (req, res) => {
    try {
        const docs = await TeachingPdf_1.TeachingPdf.find()
            .sort({ sortOrder: 1, createdAt: -1 })
            .populate("createdBy", "name")
            .lean();
        res.json({
            success: true,
            message: "Teaching PDFs loaded",
            data: docs.map((doc) => formatTeachingPdf(doc)),
        });
    }
    catch {
        res.status(500).json({ success: false, message: "Failed to load teaching PDFs" });
    }
};
exports.listTeachingPdfs = listTeachingPdfs;
const getTeachingPdfById = async (req, res) => {
    try {
        const doc = await TeachingPdf_1.TeachingPdf.findById(req.params.id)
            .populate("createdBy", "name")
            .lean();
        if (!doc) {
            res.status(404).json({ success: false, message: "PDF not found" });
            return;
        }
        res.json({
            success: true,
            message: "PDF loaded",
            data: formatTeachingPdf(doc),
        });
    }
    catch {
        res.status(500).json({ success: false, message: "Failed to load PDF" });
    }
};
exports.getTeachingPdfById = getTeachingPdfById;
const createTeachingPdf = async (req, res) => {
    try {
        const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
        const url = typeof req.body?.url === "string" ? req.body.url.trim() : "";
        const notes = typeof req.body?.notes === "string" ? req.body.notes.trim() : undefined;
        const sortOrder = typeof req.body?.sortOrder === "number" && Number.isFinite(req.body.sortOrder)
            ? req.body.sortOrder
            : 0;
        if (!name || name.length < 2) {
            res.status(400).json({ success: false, message: "Name is required (min 2 chars)" });
            return;
        }
        if (!url || !isValidHttpUrl(url)) {
            res.status(400).json({ success: false, message: "A valid http(s) URL is required" });
            return;
        }
        const doc = await TeachingPdf_1.TeachingPdf.create({
            name,
            url,
            notes: notes || undefined,
            sortOrder,
            createdBy: req.user._id,
        });
        const populated = await TeachingPdf_1.TeachingPdf.findById(doc._id)
            .populate("createdBy", "name")
            .lean();
        res.status(201).json({
            success: true,
            message: "PDF added to library",
            data: populated ? formatTeachingPdf(populated) : formatTeachingPdf(doc),
        });
    }
    catch {
        res.status(500).json({ success: false, message: "Failed to add PDF" });
    }
};
exports.createTeachingPdf = createTeachingPdf;
const updateTeachingPdf = async (req, res) => {
    try {
        const doc = await TeachingPdf_1.TeachingPdf.findById(req.params.id);
        if (!doc) {
            res.status(404).json({ success: false, message: "PDF not found" });
            return;
        }
        if (!canManagePdf(req.user._id.toString(), req.user.role, doc)) {
            res.status(403).json({ success: false, message: "Not allowed to edit this PDF" });
            return;
        }
        if (typeof req.body?.name === "string") {
            const name = req.body.name.trim();
            if (name.length >= 2)
                doc.name = name;
        }
        if (typeof req.body?.url === "string") {
            const url = req.body.url.trim();
            if (!isValidHttpUrl(url)) {
                res.status(400).json({ success: false, message: "Invalid URL" });
                return;
            }
            doc.url = url;
        }
        if (typeof req.body?.notes === "string") {
            doc.notes = req.body.notes.trim() || undefined;
        }
        if (typeof req.body?.sortOrder === "number" &&
            Number.isFinite(req.body.sortOrder)) {
            doc.sortOrder = req.body.sortOrder;
        }
        doc.updatedBy = req.user._id;
        await doc.save();
        const populated = await TeachingPdf_1.TeachingPdf.findById(doc._id)
            .populate("createdBy", "name")
            .lean();
        res.json({
            success: true,
            message: "PDF updated",
            data: populated ? formatTeachingPdf(populated) : formatTeachingPdf(doc),
        });
    }
    catch {
        res.status(500).json({ success: false, message: "Failed to update PDF" });
    }
};
exports.updateTeachingPdf = updateTeachingPdf;
const deleteTeachingPdf = async (req, res) => {
    try {
        const doc = await TeachingPdf_1.TeachingPdf.findById(req.params.id);
        if (!doc) {
            res.status(404).json({ success: false, message: "PDF not found" });
            return;
        }
        if (!canManagePdf(req.user._id.toString(), req.user.role, doc)) {
            res.status(403).json({ success: false, message: "Not allowed to delete this PDF" });
            return;
        }
        await doc.deleteOne();
        res.json({ success: true, message: "PDF removed", data: null });
    }
    catch {
        res.status(500).json({ success: false, message: "Failed to delete PDF" });
    }
};
exports.deleteTeachingPdf = deleteTeachingPdf;
const proxyTeachingPdf = async (req, res) => {
    const rawUrl = typeof req.query.url === "string" ? req.query.url.trim() : "";
    if (!rawUrl || !isValidHttpUrl(rawUrl)) {
        res.status(400).json({ success: false, message: "Valid url query param required" });
        return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);
    try {
        const upstream = await fetch(rawUrl, {
            signal: controller.signal,
            headers: {
                Accept: "application/pdf,*/*",
                "User-Agent": "BOQ-Academy-TeachingStudio/1.0",
            },
            redirect: "follow",
        });
        if (!upstream.ok) {
            res.status(502).json({
                success: false,
                message: `Upstream returned ${upstream.status}`,
            });
            return;
        }
        const contentType = upstream.headers.get("content-type") ?? "";
        const contentLength = upstream.headers.get("content-length");
        if (contentLength && Number(contentLength) > MAX_PDF_BYTES) {
            res.status(413).json({ success: false, message: "PDF file too large" });
            return;
        }
        const buffer = Buffer.from(await upstream.arrayBuffer());
        if (buffer.byteLength > MAX_PDF_BYTES) {
            res.status(413).json({ success: false, message: "PDF file too large" });
            return;
        }
        const isPdf = contentType.includes("pdf") ||
            rawUrl.toLowerCase().includes(".pdf") ||
            buffer.subarray(0, 4).toString() === "%PDF";
        res.setHeader("Content-Type", isPdf ? "application/pdf" : contentType || "application/octet-stream");
        res.setHeader("Content-Length", String(buffer.byteLength));
        res.setHeader("Cache-Control", "private, max-age=3600");
        res.send(buffer);
    }
    catch {
        res.status(502).json({ success: false, message: "Failed to fetch PDF" });
    }
    finally {
        clearTimeout(timer);
    }
};
exports.proxyTeachingPdf = proxyTeachingPdf;
