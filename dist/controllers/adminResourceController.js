"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminUploadResourceFile = exports.adminDeleteResource = exports.adminUpdateResource = exports.adminCreateResource = exports.adminGetResourceById = exports.adminGetResources = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Resource_1 = require("../models/Resource");
const cloudinaryUploadService_1 = require("../services/cloudinaryUploadService");
const slugify_1 = require("../utils/slugify");
const VALID_STATUS = ["draft", "published"];
const formatResource = (resource) => ({
    id: resource._id.toString(),
    type: resource.type,
    section: resource.section,
    title: resource.title,
    slug: resource.slug,
    description: resource.description,
    status: resource.status,
    featured: resource.featured,
    sortOrder: resource.sortOrder,
    category: resource.category,
    coverGradient: resource.coverGradient,
    coverUrl: resource.coverUrl,
    coverPublicId: resource.coverPublicId,
    pdfUrl: resource.pdfUrl,
    pdfPublicId: resource.pdfPublicId,
    fileSize: resource.fileSize,
    pageCount: resource.pageCount,
    language: resource.language,
    author: resource.author,
    audioUrl: resource.audioUrl,
    audioPublicId: resource.audioPublicId,
    duration: resource.duration,
    paraInfo: resource.paraInfo,
    surahName: resource.surahName,
    progress: resource.progress,
    verses: resource.verses,
    youtubeId: resource.youtubeId,
    startSeconds: resource.startSeconds,
    translations: resource.translations,
    publishedAt: resource.publishedAt,
    createdAt: resource.createdAt,
    updatedAt: resource.updatedAt,
});
async function ensureUniqueSlug(type, base, excludeId) {
    let slug = base;
    let n = 0;
    while (true) {
        const filter = { type, slug };
        if (excludeId)
            filter._id = { $ne: excludeId };
        const exists = await Resource_1.Resource.findOne(filter).select("_id");
        if (!exists)
            return slug;
        n += 1;
        slug = `${base}-${n}`;
    }
}
function isValidType(value) {
    return Resource_1.RESOURCE_TYPES.includes(value);
}
function parseVerses(value) {
    if (!Array.isArray(value))
        return undefined;
    return value
        .filter((v) => typeof v === "object" &&
        v !== null &&
        typeof v.arabic === "string" &&
        typeof v.translation === "string")
        .map((v) => ({
        arabic: v.arabic.trim(),
        translation: v.translation.trim(),
    }));
}
const adminGetResources = async (req, res) => {
    try {
        const { type, status, section } = req.query;
        const filter = {};
        if (type) {
            if (!isValidType(String(type))) {
                res.status(400).json({
                    success: false,
                    message: "Invalid type filter",
                    data: null,
                });
                return;
            }
            filter.type = String(type);
        }
        if (status) {
            if (!VALID_STATUS.includes(status)) {
                res.status(400).json({
                    success: false,
                    message: "Invalid status filter",
                    data: null,
                });
                return;
            }
            filter.status = String(status);
        }
        if (section)
            filter.section = String(section);
        const items = await Resource_1.Resource.find(filter).sort({
            sortOrder: 1,
            createdAt: -1,
        });
        res.status(200).json({
            success: true,
            message: "Resources fetched successfully",
            data: items.map((item) => formatResource(item)),
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch resources",
            data: null,
        });
    }
};
exports.adminGetResources = adminGetResources;
const adminGetResourceById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid resource id",
                data: null,
            });
            return;
        }
        const item = await Resource_1.Resource.findById(id);
        if (!item) {
            res.status(404).json({
                success: false,
                message: "Resource not found",
                data: null,
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: "Resource fetched successfully",
            data: formatResource(item),
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch resource",
            data: null,
        });
    }
};
exports.adminGetResourceById = adminGetResourceById;
const adminCreateResource = async (req, res) => {
    try {
        const body = req.body;
        const type = String(body.type ?? "");
        if (!isValidType(type)) {
            res.status(400).json({
                success: false,
                message: "Invalid resource type",
                data: null,
            });
            return;
        }
        const title = String(body.title ?? "").trim();
        if (!title) {
            res.status(400).json({
                success: false,
                message: "Title is required",
                data: null,
            });
            return;
        }
        const section = String(body.section ?? "default");
        if (!Resource_1.RESOURCE_SECTIONS.includes(section)) {
            res.status(400).json({
                success: false,
                message: "Invalid section",
                data: null,
            });
            return;
        }
        const status = body.status ?? "draft";
        if (!VALID_STATUS.includes(status)) {
            res.status(400).json({
                success: false,
                message: "Invalid status",
                data: null,
            });
            return;
        }
        const category = body.category;
        if (category && !Resource_1.EBOOK_CATEGORIES.includes(category)) {
            res.status(400).json({
                success: false,
                message: "Invalid ebook category",
                data: null,
            });
            return;
        }
        const language = body.language;
        if (language && !Resource_1.EBOOK_LANGUAGES.includes(language)) {
            res.status(400).json({
                success: false,
                message: "Invalid language",
                data: null,
            });
            return;
        }
        const baseSlug = (0, slugify_1.slugifyTitle)(String(body.slug ?? "").trim() || title);
        const slug = await ensureUniqueSlug(type, baseSlug);
        const item = await Resource_1.Resource.create({
            type,
            section,
            title,
            slug,
            description: String(body.description ?? "").trim() || undefined,
            status,
            featured: Boolean(body.featured),
            sortOrder: Number(body.sortOrder) || 0,
            category,
            coverGradient: String(body.coverGradient ?? "").trim() || undefined,
            coverUrl: String(body.coverUrl ?? "").trim() || undefined,
            coverPublicId: String(body.coverPublicId ?? "").trim() || undefined,
            pdfUrl: String(body.pdfUrl ?? "").trim() || undefined,
            pdfPublicId: String(body.pdfPublicId ?? "").trim() || undefined,
            fileSize: String(body.fileSize ?? "").trim() || undefined,
            pageCount: body.pageCount ? Number(body.pageCount) : undefined,
            language,
            author: String(body.author ?? "").trim() || undefined,
            audioUrl: String(body.audioUrl ?? "").trim() || undefined,
            audioPublicId: String(body.audioPublicId ?? "").trim() || undefined,
            duration: String(body.duration ?? "").trim() || undefined,
            paraInfo: String(body.paraInfo ?? "").trim() || undefined,
            surahName: String(body.surahName ?? "").trim() || undefined,
            progress: body.progress !== undefined ? Number(body.progress) : undefined,
            verses: parseVerses(body.verses),
            youtubeId: String(body.youtubeId ?? "").trim() || undefined,
            startSeconds: body.startSeconds !== undefined
                ? Number(body.startSeconds)
                : undefined,
            publishedAt: status === "published" ? new Date() : undefined,
            createdBy: req.user._id,
        });
        res.status(201).json({
            success: true,
            message: "Resource created successfully",
            data: formatResource(item),
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to create resource",
            data: null,
        });
    }
};
exports.adminCreateResource = adminCreateResource;
const adminUpdateResource = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid resource id",
                data: null,
            });
            return;
        }
        const item = await Resource_1.Resource.findById(id);
        if (!item) {
            res.status(404).json({
                success: false,
                message: "Resource not found",
                data: null,
            });
            return;
        }
        const body = req.body;
        if (body.title !== undefined) {
            const title = String(body.title).trim();
            if (!title) {
                res.status(400).json({
                    success: false,
                    message: "Title cannot be empty",
                    data: null,
                });
                return;
            }
            item.title = title;
        }
        if (body.slug !== undefined) {
            const baseSlug = (0, slugify_1.slugifyTitle)(String(body.slug).trim() || item.title);
            item.slug = await ensureUniqueSlug(item.type, baseSlug, id);
        }
        if (body.section !== undefined) {
            const section = String(body.section);
            if (!Resource_1.RESOURCE_SECTIONS.includes(section)) {
                res.status(400).json({
                    success: false,
                    message: "Invalid section",
                    data: null,
                });
                return;
            }
            item.section = section;
        }
        if (body.description !== undefined) {
            item.description = String(body.description).trim() || undefined;
        }
        if (body.status !== undefined) {
            const status = body.status;
            if (!VALID_STATUS.includes(status)) {
                res.status(400).json({
                    success: false,
                    message: "Invalid status",
                    data: null,
                });
                return;
            }
            if (status === "published" && item.status !== "published") {
                item.publishedAt = new Date();
            }
            item.status = status;
        }
        if (body.featured !== undefined)
            item.featured = Boolean(body.featured);
        if (body.sortOrder !== undefined)
            item.sortOrder = Number(body.sortOrder) || 0;
        if (body.category !== undefined) {
            const category = body.category;
            if (category && !Resource_1.EBOOK_CATEGORIES.includes(category)) {
                res.status(400).json({
                    success: false,
                    message: "Invalid ebook category",
                    data: null,
                });
                return;
            }
            item.category = category || undefined;
        }
        if (body.coverGradient !== undefined) {
            item.coverGradient = String(body.coverGradient).trim() || undefined;
        }
        if (body.coverUrl !== undefined) {
            item.coverUrl = String(body.coverUrl).trim() || undefined;
        }
        if (body.coverPublicId !== undefined) {
            item.coverPublicId = String(body.coverPublicId).trim() || undefined;
        }
        if (body.pdfUrl !== undefined) {
            item.pdfUrl = String(body.pdfUrl).trim() || undefined;
        }
        if (body.pdfPublicId !== undefined) {
            item.pdfPublicId = String(body.pdfPublicId).trim() || undefined;
        }
        if (body.fileSize !== undefined) {
            item.fileSize = String(body.fileSize).trim() || undefined;
        }
        if (body.pageCount !== undefined) {
            item.pageCount = Number(body.pageCount) || undefined;
        }
        if (body.language !== undefined) {
            const language = body.language;
            if (language && !Resource_1.EBOOK_LANGUAGES.includes(language)) {
                res.status(400).json({
                    success: false,
                    message: "Invalid language",
                    data: null,
                });
                return;
            }
            item.language = language || undefined;
        }
        if (body.author !== undefined) {
            item.author = String(body.author).trim() || undefined;
        }
        if (body.audioUrl !== undefined) {
            item.audioUrl = String(body.audioUrl).trim() || undefined;
        }
        if (body.audioPublicId !== undefined) {
            item.audioPublicId = String(body.audioPublicId).trim() || undefined;
        }
        if (body.duration !== undefined) {
            item.duration = String(body.duration).trim() || undefined;
        }
        if (body.paraInfo !== undefined) {
            item.paraInfo = String(body.paraInfo).trim() || undefined;
        }
        if (body.surahName !== undefined) {
            item.surahName = String(body.surahName).trim() || undefined;
        }
        if (body.progress !== undefined) {
            item.progress = Number(body.progress);
        }
        if (body.verses !== undefined) {
            item.verses = parseVerses(body.verses);
        }
        if (body.youtubeId !== undefined) {
            item.youtubeId = String(body.youtubeId).trim() || undefined;
        }
        if (body.startSeconds !== undefined) {
            item.startSeconds = Number(body.startSeconds) || undefined;
        }
        item.updatedBy = req.user._id;
        await item.save();
        res.status(200).json({
            success: true,
            message: "Resource updated successfully",
            data: formatResource(item),
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to update resource",
            data: null,
        });
    }
};
exports.adminUpdateResource = adminUpdateResource;
const adminDeleteResource = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid resource id",
                data: null,
            });
            return;
        }
        const item = await Resource_1.Resource.findByIdAndDelete(id);
        if (!item) {
            res.status(404).json({
                success: false,
                message: "Resource not found",
                data: null,
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: "Resource deleted successfully",
            data: null,
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to delete resource",
            data: null,
        });
    }
};
exports.adminDeleteResource = adminDeleteResource;
/** POST /admin/resources/upload — multipart file → Cloudinary */
const adminUploadResourceFile = async (req, res) => {
    try {
        const file = req.file;
        const purpose = String(req.body.purpose ?? "file");
        if (!file) {
            res.status(400).json({
                success: false,
                message: "No file uploaded",
                data: null,
            });
            return;
        }
        let folder = "misc";
        let resourceType = "raw";
        if (purpose === "pdf" || file.mimetype === "application/pdf") {
            folder = "ebooks";
            resourceType = "raw";
        }
        else if (purpose === "gallery" && file.mimetype.startsWith("video/")) {
            folder = "gallery";
            resourceType = "video";
        }
        else if (purpose === "gallery" && file.mimetype.startsWith("audio/")) {
            folder = "gallery";
            resourceType = "video";
        }
        else if (purpose === "gallery" && file.mimetype.startsWith("image/")) {
            folder = "gallery";
            resourceType = "image";
        }
        else if (file.mimetype.startsWith("audio/")) {
            folder = "audio";
            resourceType = "video";
        }
        else if (file.mimetype.startsWith("image/")) {
            folder = "covers";
            resourceType = "image";
        }
        const uploaded = await (0, cloudinaryUploadService_1.uploadResourceMedia)(file.buffer, folder, file.mimetype, resourceType);
        const fileSizeMb = (file.size / (1024 * 1024)).toFixed(1);
        res.status(200).json({
            success: true,
            message: "File uploaded successfully",
            data: {
                url: uploaded.url,
                publicId: uploaded.publicId,
                fileSize: `${fileSizeMb} MB`,
                mimeType: file.mimetype,
            },
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        if (message === "CLOUDINARY_NOT_CONFIGURED") {
            res.status(503).json({
                success: false,
                message: "File storage is not configured",
                data: null,
            });
            return;
        }
        if (message === "FILE_TOO_LARGE") {
            res.status(400).json({
                success: false,
                message: "File exceeds 15 MB limit",
                data: null,
            });
            return;
        }
        res.status(500).json({
            success: false,
            message: "Failed to upload file",
            data: null,
        });
    }
};
exports.adminUploadResourceFile = adminUploadResourceFile;
