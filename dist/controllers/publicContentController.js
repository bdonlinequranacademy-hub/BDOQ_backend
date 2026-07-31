"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPublicSchedulePreviewHandler = exports.getPublicSectionHeadersHandler = exports.getPublicHomeHeroHandler = exports.getPublicGalleryHandler = exports.getPublicFaqHandler = exports.getPublicTestimonialsHandler = exports.getPublicPricingHandler = exports.getPublicCourseBySlugHandler = exports.getPublicCoursesHandler = exports.getPublicProgressHighlightsHandler = exports.getPublicStatsHandler = exports.getPublicTeacherBySlugHandler = exports.getPublicTeachersHandler = void 0;
const publicContentService_1 = require("../services/publicContentService");
const publicMarketingService_1 = require("../services/publicMarketingService");
const homeHeroService_1 = require("../services/homeHeroService");
const sectionHeaderService_1 = require("../services/sectionHeaderService");
const getPublicTeachersHandler = async (req, res) => {
    try {
        const genderParam = req.query.gender;
        const featuredParam = req.query.featured;
        const gender = genderParam === "male" || genderParam === "female"
            ? genderParam
            : undefined;
        const featured = featuredParam === "true" || featuredParam === "1" ? true : undefined;
        const teachers = await (0, publicContentService_1.listPublicTeachers)({ gender, featured });
        res.status(200).json({
            success: true,
            message: "Teachers fetched successfully",
            data: { teachers },
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch teachers",
            data: null,
        });
    }
};
exports.getPublicTeachersHandler = getPublicTeachersHandler;
const getPublicTeacherBySlugHandler = async (req, res) => {
    try {
        const { slug } = req.params;
        const teacher = await (0, publicContentService_1.getPublicTeacherBySlug)(slug);
        if (!teacher) {
            res.status(404).json({
                success: false,
                message: "Teacher not found",
                data: null,
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: "Teacher fetched successfully",
            data: teacher,
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch teacher",
            data: null,
        });
    }
};
exports.getPublicTeacherBySlugHandler = getPublicTeacherBySlugHandler;
const getPublicStatsHandler = async (_req, res) => {
    try {
        const stats = await (0, publicContentService_1.getPublicStats)();
        res.status(200).json({
            success: true,
            message: "Public stats fetched successfully",
            data: stats,
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch public stats",
            data: null,
        });
    }
};
exports.getPublicStatsHandler = getPublicStatsHandler;
const getPublicProgressHighlightsHandler = async (_req, res) => {
    try {
        const highlights = await (0, publicContentService_1.getPublicProgressHighlights)();
        res.status(200).json({
            success: true,
            message: "Progress highlights fetched successfully",
            data: highlights,
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch progress highlights",
            data: null,
        });
    }
};
exports.getPublicProgressHighlightsHandler = getPublicProgressHighlightsHandler;
const getPublicCoursesHandler = async (req, res) => {
    try {
        const category = typeof req.query.category === "string" ? req.query.category : undefined;
        const gender = typeof req.query.gender === "string" ? req.query.gender : undefined;
        const courses = await (0, publicMarketingService_1.listPublicCourses)({ category, gender });
        res.status(200).json({
            success: true,
            message: "Courses fetched successfully",
            data: { courses },
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
exports.getPublicCoursesHandler = getPublicCoursesHandler;
const getPublicCourseBySlugHandler = async (req, res) => {
    try {
        const course = await (0, publicMarketingService_1.getPublicCourseBySlug)(req.params.slug);
        if (!course) {
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
            data: course,
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
exports.getPublicCourseBySlugHandler = getPublicCourseBySlugHandler;
const getPublicPricingHandler = async (_req, res) => {
    try {
        const packages = await (0, publicMarketingService_1.listPublicPricing)();
        res.status(200).json({
            success: true,
            message: "Pricing fetched successfully",
            data: { packages },
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch pricing",
            data: null,
        });
    }
};
exports.getPublicPricingHandler = getPublicPricingHandler;
const getPublicTestimonialsHandler = async (_req, res) => {
    try {
        const testimonials = await (0, publicMarketingService_1.listPublicTestimonials)();
        res.status(200).json({
            success: true,
            message: "Testimonials fetched successfully",
            data: { testimonials },
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
exports.getPublicTestimonialsHandler = getPublicTestimonialsHandler;
const getPublicFaqHandler = async (_req, res) => {
    try {
        const items = await (0, publicMarketingService_1.listPublicFaq)();
        res.status(200).json({
            success: true,
            message: "FAQ fetched successfully",
            data: { items },
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch FAQ",
            data: null,
        });
    }
};
exports.getPublicFaqHandler = getPublicFaqHandler;
const getPublicGalleryHandler = async (_req, res) => {
    try {
        const items = await (0, publicMarketingService_1.listPublicGallery)();
        res.status(200).json({
            success: true,
            message: "Gallery fetched successfully",
            data: { items },
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch gallery",
            data: null,
        });
    }
};
exports.getPublicGalleryHandler = getPublicGalleryHandler;
const getPublicHomeHeroHandler = async (req, res) => {
    try {
        const localeParam = req.query.locale;
        const locale = localeParam === "bn" ? "bn" : "en";
        const slides = await (0, homeHeroService_1.listPublicHomeHeroSlides)(locale);
        res.status(200).json({
            success: true,
            message: "Home hero fetched successfully",
            data: { slides },
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch home hero",
            data: null,
        });
    }
};
exports.getPublicHomeHeroHandler = getPublicHomeHeroHandler;
const getPublicSectionHeadersHandler = async (req, res) => {
    try {
        const localeParam = req.query.locale;
        const locale = localeParam === "bn" ? "bn" : "en";
        const keysParam = req.query.keys;
        const keys = typeof keysParam === "string" && keysParam.trim()
            ? keysParam.split(",").map((key) => key.trim())
            : undefined;
        const headers = await (0, sectionHeaderService_1.listPublicSectionHeaders)(locale, keys);
        res.status(200).json({
            success: true,
            message: "Section headers fetched successfully",
            data: { headers },
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch section headers",
            data: null,
        });
    }
};
exports.getPublicSectionHeadersHandler = getPublicSectionHeadersHandler;
const getPublicSchedulePreviewHandler = async (_req, res) => {
    try {
        const schedule = await (0, publicMarketingService_1.getPublicWeeklySchedulePreview)();
        res.status(200).json({
            success: true,
            message: "Schedule preview fetched successfully",
            data: schedule,
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch schedule preview",
            data: null,
        });
    }
};
exports.getPublicSchedulePreviewHandler = getPublicSchedulePreviewHandler;
