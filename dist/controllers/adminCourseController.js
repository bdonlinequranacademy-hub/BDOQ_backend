"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminDeleteCourse = exports.adminUpdateCourse = exports.adminCreateCourse = exports.adminGetCourseById = exports.adminGetCourses = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const CourseCatalog_1 = require("../models/CourseCatalog");
const COURSE_CATEGORIES = ["private", "record", "live", "free"];
const COURSE_GENDERS = ["male", "female", "children"];
const formatCourseCatalog = (doc) => ({
    id: doc._id.toString(),
    slug: doc.slug,
    title: doc.title,
    description: doc.description,
    icon: doc.icon,
    target: doc.target,
    category: doc.category,
    gender: doc.gender,
    sortOrder: doc.sortOrder,
    showOnWebsite: doc.showOnWebsite,
    detail: doc.detail,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
});
function buildSlug(title) {
    const base = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 48);
    return base || `course-${Date.now()}`;
}
function isValidCategory(value) {
    return COURSE_CATEGORIES.includes(value);
}
function isValidGender(value) {
    return COURSE_GENDERS.includes(value);
}
function parseStringArray(value) {
    if (Array.isArray(value)) {
        return value
            .filter((item) => typeof item === "string")
            .map((item) => item.trim())
            .filter(Boolean);
    }
    if (typeof value === "string") {
        return value
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean);
    }
    return [];
}
function parseBenefits(value) {
    if (!Array.isArray(value)) {
        return [];
    }
    return value
        .filter((item) => !!item && typeof item === "object")
        .map((item, index) => ({
        id: typeof item.id === "string" && item.id.trim()
            ? item.id.trim()
            : `benefit-${index + 1}`,
        title: typeof item.title === "string" ? item.title.trim() : "",
        description: typeof item.description === "string" ? item.description.trim() : "",
        icon: typeof item.icon === "string" && item.icon.trim() ? item.icon.trim() : "✓",
    }))
        .filter((item) => item.title && item.description);
}
function parseModules(value) {
    if (!Array.isArray(value)) {
        return [];
    }
    return value
        .filter((item) => !!item && typeof item === "object")
        .map((item, index) => ({
        id: typeof item.id === "string" && item.id.trim()
            ? item.id.trim()
            : `module-${index + 1}`,
        title: typeof item.title === "string" ? item.title.trim() : "",
        topics: parseStringArray(item.topics),
    }))
        .filter((item) => item.title);
}
function parseCourseFaqs(value) {
    if (!Array.isArray(value)) {
        return [];
    }
    return value
        .filter((item) => !!item && typeof item === "object")
        .map((item, index) => ({
        id: typeof item.id === "string" && item.id.trim()
            ? item.id.trim()
            : `faq-${index + 1}`,
        question: typeof item.question === "string" ? item.question.trim() : "",
        answer: typeof item.answer === "string" ? item.answer.trim() : "",
    }))
        .filter((item) => item.question && item.answer);
}
function defaultCourseDetail() {
    return {
        benefits: [],
        modules: [],
        audience: [],
        faqs: [],
        startingPriceBdt: 2000,
        recommendedPackage: "Basic",
    };
}
function parseCourseDetail(value) {
    const defaults = defaultCourseDetail();
    if (!value || typeof value !== "object") {
        return defaults;
    }
    const obj = value;
    return {
        benefits: parseBenefits(obj.benefits),
        modules: parseModules(obj.modules),
        audience: parseStringArray(obj.audience),
        faqs: parseCourseFaqs(obj.faqs),
        startingPriceBdt: typeof obj.startingPriceBdt === "number" && obj.startingPriceBdt >= 0
            ? obj.startingPriceBdt
            : defaults.startingPriceBdt,
        recommendedPackage: typeof obj.recommendedPackage === "string" && obj.recommendedPackage.trim()
            ? obj.recommendedPackage.trim()
            : defaults.recommendedPackage,
    };
}
const adminGetCourses = async (_req, res) => {
    try {
        const docs = await CourseCatalog_1.CourseCatalog.find().sort({ sortOrder: 1, createdAt: -1 });
        res.status(200).json({
            success: true,
            message: "Courses fetched successfully",
            data: docs.map((doc) => formatCourseCatalog(doc)),
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch courses",
            data: null,
        });
    }
};
exports.adminGetCourses = adminGetCourses;
const adminGetCourseById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid course id",
                data: null,
            });
            return;
        }
        const doc = await CourseCatalog_1.CourseCatalog.findById(id);
        if (!doc) {
            res.status(404).json({
                success: false,
                message: "Course not found",
                data: null,
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: "Course fetched successfully",
            data: formatCourseCatalog(doc),
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch course",
            data: null,
        });
    }
};
exports.adminGetCourseById = adminGetCourseById;
const adminCreateCourse = async (req, res) => {
    try {
        const body = req.body;
        const { slug, title, description, category, gender, icon, target, sortOrder, showOnWebsite, detail } = body;
        if (typeof title !== "string" || !title.trim()) {
            res.status(400).json({
                success: false,
                message: "Course title is required",
                data: null,
            });
            return;
        }
        if (typeof description !== "string" || !description.trim()) {
            res.status(400).json({
                success: false,
                message: "Course description is required",
                data: null,
            });
            return;
        }
        if (typeof category !== "string" || !isValidCategory(category)) {
            res.status(400).json({
                success: false,
                message: "Valid category is required (private, record, live, or free)",
                data: null,
            });
            return;
        }
        if (gender !== undefined && gender !== null && gender !== "") {
            if (typeof gender !== "string" || !isValidGender(gender)) {
                res.status(400).json({
                    success: false,
                    message: "Gender must be male, female, or children when provided",
                    data: null,
                });
                return;
            }
        }
        const resolvedSlug = typeof slug === "string" && slug.trim()
            ? slug.trim().toLowerCase()
            : buildSlug(title);
        const doc = await CourseCatalog_1.CourseCatalog.create({
            slug: resolvedSlug,
            title: title.trim(),
            description: description.trim(),
            category,
            gender: typeof gender === "string" && isValidGender(gender) ? gender : undefined,
            icon: typeof icon === "string" && icon.trim() ? icon.trim() : "📖",
            target: typeof target === "string" && target.trim() ? target.trim() : undefined,
            sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
            showOnWebsite: showOnWebsite !== false,
            detail: parseCourseDetail(detail),
        });
        res.status(201).json({
            success: true,
            message: "Course created successfully",
            data: formatCourseCatalog(doc),
        });
    }
    catch (error) {
        const message = error instanceof Error && error.message.includes("duplicate")
            ? "A course with this slug already exists"
            : "Failed to create course";
        res.status(500).json({ success: false, message, data: null });
    }
};
exports.adminCreateCourse = adminCreateCourse;
const adminUpdateCourse = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid course id",
                data: null,
            });
            return;
        }
        const doc = await CourseCatalog_1.CourseCatalog.findById(id);
        if (!doc) {
            res.status(404).json({
                success: false,
                message: "Course not found",
                data: null,
            });
            return;
        }
        const body = req.body;
        if (typeof body.slug === "string" && body.slug.trim()) {
            doc.slug = body.slug.trim().toLowerCase();
        }
        if (typeof body.title === "string" && body.title.trim()) {
            doc.title = body.title.trim();
        }
        if (typeof body.description === "string" && body.description.trim()) {
            doc.description = body.description.trim();
        }
        if (typeof body.category === "string") {
            if (!isValidCategory(body.category)) {
                res.status(400).json({
                    success: false,
                    message: "Valid category is required (private, record, live, or free)",
                    data: null,
                });
                return;
            }
            doc.category = body.category;
        }
        if (body.gender !== undefined) {
            if (body.gender === null || body.gender === "") {
                doc.gender = undefined;
            }
            else if (typeof body.gender === "string" && isValidGender(body.gender)) {
                doc.gender = body.gender;
            }
            else {
                res.status(400).json({
                    success: false,
                    message: "Gender must be male, female, or children when provided",
                    data: null,
                });
                return;
            }
        }
        if (typeof body.icon === "string" && body.icon.trim()) {
            doc.icon = body.icon.trim();
        }
        if (body.target !== undefined) {
            doc.target =
                typeof body.target === "string" && body.target.trim()
                    ? body.target.trim()
                    : undefined;
        }
        if (typeof body.sortOrder === "number") {
            doc.sortOrder = body.sortOrder;
        }
        if (typeof body.showOnWebsite === "boolean") {
            doc.showOnWebsite = body.showOnWebsite;
        }
        if (body.detail !== undefined) {
            doc.detail = parseCourseDetail(body.detail);
        }
        await doc.save();
        res.status(200).json({
            success: true,
            message: "Course updated successfully",
            data: formatCourseCatalog(doc),
        });
    }
    catch (error) {
        const message = error instanceof Error && error.message.includes("duplicate")
            ? "A course with this slug already exists"
            : "Failed to update course";
        res.status(500).json({ success: false, message, data: null });
    }
};
exports.adminUpdateCourse = adminUpdateCourse;
const adminDeleteCourse = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: "Invalid course id",
                data: null,
            });
            return;
        }
        const doc = await CourseCatalog_1.CourseCatalog.findByIdAndDelete(id);
        if (!doc) {
            res.status(404).json({
                success: false,
                message: "Course not found",
                data: null,
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: "Course deleted successfully",
            data: null,
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to delete course",
            data: null,
        });
    }
};
exports.adminDeleteCourse = adminDeleteCourse;
