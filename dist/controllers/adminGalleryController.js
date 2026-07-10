"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminDeleteGalleryItem = exports.adminUpdateGalleryItem = exports.adminCreateGalleryItem = exports.adminGetGalleryItemById = exports.adminGetGalleryItems = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const GalleryItem_1 = require("../models/GalleryItem");
const GALLERY_ALBUMS = [
    "gallery-01",
    "gallery-02",
    "gallery-03",
];
function isValidAlbum(value) {
    return GALLERY_ALBUMS.includes(value);
}
function isValidMediaType(value) {
    return GalleryItem_1.GALLERY_MEDIA_TYPES.includes(value);
}
function parseMediaType(value) {
    if (typeof value === "string" && isValidMediaType(value)) {
        return value;
    }
    return "photo";
}
function buildExternalId(title) {
    const base = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 36);
    return `gallery-${base || "item"}-${Date.now()}`;
}
function resolveMediaUrl(doc) {
    const mediaUrl = doc.mediaUrl?.trim();
    if (mediaUrl)
        return mediaUrl;
    return doc.imageUrl?.trim() || undefined;
}
const formatGalleryItem = (doc) => ({
    id: doc._id.toString(),
    externalId: doc.externalId,
    title: doc.title,
    description: doc.description,
    album: doc.album,
    mediaType: doc.mediaType ?? "photo",
    mediaUrl: resolveMediaUrl(doc),
    mediaPublicId: doc.mediaPublicId,
    youtubeId: doc.youtubeId,
    coverGradient: doc.coverGradient,
    heightClass: doc.heightClass,
    sortOrder: doc.sortOrder,
    showOnWebsite: doc.showOnWebsite,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
});
function validateMediaPayload(_mediaType, _mediaUrl, _youtubeId) {
    return null;
}
const adminGetGalleryItems = async (_req, res) => {
    try {
        const docs = await GalleryItem_1.GalleryItem.find().sort({ sortOrder: 1, createdAt: -1 });
        res.status(200).json({
            success: true,
            message: "Gallery items fetched successfully",
            data: docs.map((doc) => formatGalleryItem(doc)),
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch gallery items",
            data: null,
        });
    }
};
exports.adminGetGalleryItems = adminGetGalleryItems;
const adminGetGalleryItemById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid gallery item id",
                data: null,
            });
            return;
        }
        const doc = await GalleryItem_1.GalleryItem.findById(id);
        if (!doc) {
            res.status(404).json({
                success: false,
                message: "Gallery item not found",
                data: null,
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: "Gallery item fetched successfully",
            data: formatGalleryItem(doc),
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch gallery item",
            data: null,
        });
    }
};
exports.adminGetGalleryItemById = adminGetGalleryItemById;
const adminCreateGalleryItem = async (req, res) => {
    try {
        const { title, description, album, mediaType, mediaUrl, mediaPublicId, youtubeId, coverGradient, heightClass, sortOrder, showOnWebsite, externalId, } = req.body;
        if (typeof title !== "string" || !title.trim()) {
            res.status(400).json({
                success: false,
                message: "Title is required",
                data: null,
            });
            return;
        }
        if (typeof album !== "string" || !isValidAlbum(album)) {
            res.status(400).json({
                success: false,
                message: "Valid album is required",
                data: null,
            });
            return;
        }
        const parsedMediaType = parseMediaType(mediaType);
        const parsedMediaUrl = typeof mediaUrl === "string" ? mediaUrl.trim() : undefined;
        const parsedYoutubeId = typeof youtubeId === "string" ? youtubeId.trim() : undefined;
        const mediaError = validateMediaPayload(parsedMediaType, parsedMediaUrl, parsedYoutubeId);
        if (mediaError) {
            res.status(400).json({
                success: false,
                message: mediaError,
                data: null,
            });
            return;
        }
        const doc = await GalleryItem_1.GalleryItem.create({
            externalId: typeof externalId === "string" && externalId.trim()
                ? externalId.trim()
                : buildExternalId(title),
            title: title.trim(),
            description: typeof description === "string" ? description.trim() : undefined,
            album,
            mediaType: parsedMediaType,
            mediaUrl: parsedMediaUrl,
            mediaPublicId: typeof mediaPublicId === "string" ? mediaPublicId.trim() : undefined,
            youtubeId: parsedYoutubeId,
            coverGradient: typeof coverGradient === "string" && coverGradient.trim()
                ? coverGradient.trim()
                : "from-primary to-teal",
            heightClass: typeof heightClass === "string" && heightClass.trim()
                ? heightClass.trim()
                : "h-56",
            sortOrder: Number(sortOrder) || 0,
            showOnWebsite: showOnWebsite !== false,
        });
        res.status(201).json({
            success: true,
            message: "Gallery item created successfully",
            data: formatGalleryItem(doc),
        });
    }
    catch (err) {
        if (err instanceof Error && err.message.includes("duplicate key")) {
            res.status(409).json({
                success: false,
                message: "A gallery item with this ID already exists",
                data: null,
            });
            return;
        }
        res.status(500).json({
            success: false,
            message: "Failed to create gallery item",
            data: null,
        });
    }
};
exports.adminCreateGalleryItem = adminCreateGalleryItem;
const adminUpdateGalleryItem = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid gallery item id",
                data: null,
            });
            return;
        }
        const doc = await GalleryItem_1.GalleryItem.findById(id);
        if (!doc) {
            res.status(404).json({
                success: false,
                message: "Gallery item not found",
                data: null,
            });
            return;
        }
        const body = req.body;
        if (typeof body.title === "string" && body.title.trim()) {
            doc.title = body.title.trim();
        }
        if (body.description !== undefined) {
            doc.description =
                typeof body.description === "string"
                    ? body.description.trim() || undefined
                    : undefined;
        }
        if (typeof body.album === "string" && isValidAlbum(body.album)) {
            doc.album = body.album;
        }
        if (body.mediaType !== undefined) {
            doc.mediaType = parseMediaType(body.mediaType);
        }
        if (body.mediaUrl !== undefined) {
            doc.mediaUrl =
                typeof body.mediaUrl === "string"
                    ? body.mediaUrl.trim() || undefined
                    : undefined;
        }
        if (body.mediaPublicId !== undefined) {
            doc.mediaPublicId =
                typeof body.mediaPublicId === "string"
                    ? body.mediaPublicId.trim() || undefined
                    : undefined;
        }
        if (body.youtubeId !== undefined) {
            doc.youtubeId =
                typeof body.youtubeId === "string"
                    ? body.youtubeId.trim() || undefined
                    : undefined;
        }
        if (typeof body.coverGradient === "string" && body.coverGradient.trim()) {
            doc.coverGradient = body.coverGradient.trim();
        }
        if (typeof body.heightClass === "string" && body.heightClass.trim()) {
            doc.heightClass = body.heightClass.trim();
        }
        if (body.sortOrder !== undefined) {
            doc.sortOrder = Number(body.sortOrder) || 0;
        }
        if (body.showOnWebsite !== undefined) {
            doc.showOnWebsite = Boolean(body.showOnWebsite);
        }
        const mediaError = validateMediaPayload(doc.mediaType, resolveMediaUrl(doc), doc.youtubeId);
        if (mediaError) {
            res.status(400).json({
                success: false,
                message: mediaError,
                data: null,
            });
            return;
        }
        await doc.save();
        res.status(200).json({
            success: true,
            message: "Gallery item updated successfully",
            data: formatGalleryItem(doc),
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to update gallery item",
            data: null,
        });
    }
};
exports.adminUpdateGalleryItem = adminUpdateGalleryItem;
const adminDeleteGalleryItem = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid gallery item id",
                data: null,
            });
            return;
        }
        const doc = await GalleryItem_1.GalleryItem.findByIdAndDelete(id);
        if (!doc) {
            res.status(404).json({
                success: false,
                message: "Gallery item not found",
                data: null,
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: "Gallery item deleted successfully",
            data: null,
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to delete gallery item",
            data: null,
        });
    }
};
exports.adminDeleteGalleryItem = adminDeleteGalleryItem;
