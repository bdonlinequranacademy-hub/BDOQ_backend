"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminDeleteTestimonial = exports.adminUpdateTestimonial = exports.adminCreateTestimonial = exports.adminGetTestimonialById = exports.adminGetTestimonials = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Testimonial_1 = require("../models/Testimonial");
const formatTestimonial = (doc) => ({
    id: doc._id.toString(),
    externalId: doc.externalId,
    name: doc.name,
    role: doc.role,
    location: doc.location,
    content: doc.content,
    rating: doc.rating,
    image: doc.image,
    mediaType: doc.mediaType,
    mediaUrl: doc.mediaUrl,
    youtubeId: doc.youtubeId,
    sortOrder: doc.sortOrder,
    showOnWebsite: doc.showOnWebsite,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
});
function isValidMediaType(value) {
    return Testimonial_1.TESTIMONIAL_MEDIA_TYPES.includes(value);
}
function parseMediaType(value) {
    if (typeof value === "string" && isValidMediaType(value)) {
        return value;
    }
    return "text";
}
function buildExternalId(name) {
    const base = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 40);
    return `testimonial-${base || "review"}-${Date.now()}`;
}
const adminGetTestimonials = async (_req, res) => {
    try {
        const docs = await Testimonial_1.Testimonial.find().sort({ sortOrder: 1, createdAt: -1 });
        res.status(200).json({
            success: true,
            message: "Testimonials fetched successfully",
            data: docs.map((doc) => formatTestimonial(doc)),
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch testimonials",
            data: null,
        });
    }
};
exports.adminGetTestimonials = adminGetTestimonials;
const adminGetTestimonialById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid testimonial id",
                data: null,
            });
            return;
        }
        const doc = await Testimonial_1.Testimonial.findById(id);
        if (!doc) {
            res.status(404).json({
                success: false,
                message: "Testimonial not found",
                data: null,
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: "Testimonial fetched successfully",
            data: formatTestimonial(doc),
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch testimonial",
            data: null,
        });
    }
};
exports.adminGetTestimonialById = adminGetTestimonialById;
const adminCreateTestimonial = async (req, res) => {
    try {
        const { name, role, location, content, rating, image, mediaType, mediaUrl, youtubeId, sortOrder, showOnWebsite, externalId, } = req.body;
        if (typeof name !== "string" ||
            !name.trim() ||
            typeof role !== "string" ||
            !role.trim() ||
            typeof location !== "string" ||
            !location.trim() ||
            typeof content !== "string" ||
            !content.trim()) {
            res.status(400).json({
                success: false,
                message: "Name, role, location, and content are required",
                data: null,
            });
            return;
        }
        const parsedMediaType = parseMediaType(mediaType);
        if (parsedMediaType === "audio" && typeof mediaUrl !== "string") {
            res.status(400).json({
                success: false,
                message: "Audio reviews require a media URL",
                data: null,
            });
            return;
        }
        if (parsedMediaType === "video" && typeof youtubeId !== "string") {
            res.status(400).json({
                success: false,
                message: "Video reviews require a YouTube ID",
                data: null,
            });
            return;
        }
        const doc = await Testimonial_1.Testimonial.create({
            externalId: typeof externalId === "string" && externalId.trim()
                ? externalId.trim()
                : buildExternalId(name),
            name: name.trim(),
            role: role.trim(),
            location: location.trim(),
            content: content.trim(),
            rating: typeof rating === "number" && rating >= 1 && rating <= 5 ? rating : 5,
            image: typeof image === "string" ? image.trim() : undefined,
            mediaType: parsedMediaType,
            mediaUrl: parsedMediaType === "audio" && typeof mediaUrl === "string"
                ? mediaUrl.trim()
                : undefined,
            youtubeId: parsedMediaType === "video" && typeof youtubeId === "string"
                ? youtubeId.trim()
                : undefined,
            sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
            showOnWebsite: showOnWebsite !== false,
        });
        res.status(201).json({
            success: true,
            message: "Testimonial created successfully",
            data: formatTestimonial(doc),
        });
    }
    catch (error) {
        const message = error instanceof Error && error.message.includes("duplicate")
            ? "A testimonial with this ID already exists"
            : "Failed to create testimonial";
        res.status(500).json({ success: false, message, data: null });
    }
};
exports.adminCreateTestimonial = adminCreateTestimonial;
const adminUpdateTestimonial = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid testimonial id",
                data: null,
            });
            return;
        }
        const doc = await Testimonial_1.Testimonial.findById(id);
        if (!doc) {
            res.status(404).json({
                success: false,
                message: "Testimonial not found",
                data: null,
            });
            return;
        }
        const body = req.body;
        if (typeof body.name === "string" && body.name.trim()) {
            doc.name = body.name.trim();
        }
        if (typeof body.role === "string" && body.role.trim()) {
            doc.role = body.role.trim();
        }
        if (typeof body.location === "string" && body.location.trim()) {
            doc.location = body.location.trim();
        }
        if (typeof body.content === "string" && body.content.trim()) {
            doc.content = body.content.trim();
        }
        if (typeof body.rating === "number" && body.rating >= 1 && body.rating <= 5) {
            doc.rating = body.rating;
        }
        if (typeof body.image === "string") {
            doc.image = body.image.trim() || undefined;
        }
        if (body.mediaType !== undefined) {
            doc.mediaType = parseMediaType(body.mediaType);
        }
        if (typeof body.mediaUrl === "string") {
            doc.mediaUrl = body.mediaUrl.trim() || undefined;
        }
        if (typeof body.youtubeId === "string") {
            doc.youtubeId = body.youtubeId.trim() || undefined;
        }
        if (typeof body.sortOrder === "number") {
            doc.sortOrder = body.sortOrder;
        }
        if (typeof body.showOnWebsite === "boolean") {
            doc.showOnWebsite = body.showOnWebsite;
        }
        if (doc.mediaType === "text") {
            doc.mediaUrl = undefined;
            doc.youtubeId = undefined;
        }
        else if (doc.mediaType === "audio") {
            doc.youtubeId = undefined;
        }
        else if (doc.mediaType === "video") {
            doc.mediaUrl = undefined;
        }
        await doc.save();
        res.status(200).json({
            success: true,
            message: "Testimonial updated successfully",
            data: formatTestimonial(doc),
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to update testimonial",
            data: null,
        });
    }
};
exports.adminUpdateTestimonial = adminUpdateTestimonial;
const adminDeleteTestimonial = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid testimonial id",
                data: null,
            });
            return;
        }
        const doc = await Testimonial_1.Testimonial.findByIdAndDelete(id);
        if (!doc) {
            res.status(404).json({
                success: false,
                message: "Testimonial not found",
                data: null,
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: "Testimonial deleted successfully",
            data: null,
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to delete testimonial",
            data: null,
        });
    }
};
exports.adminDeleteTestimonial = adminDeleteTestimonial;
