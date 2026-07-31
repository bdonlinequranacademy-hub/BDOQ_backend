"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminSaveHomeHeroSlides = exports.adminGetHomeHeroSlides = void 0;
const homeHeroService_1 = require("../services/homeHeroService");
function isLocaleContent(value) {
    if (!value || typeof value !== "object")
        return false;
    const content = value;
    return (typeof content.badge === "string" &&
        typeof content.title === "string" &&
        typeof content.subtitle === "string" &&
        typeof content.imageAlt === "string" &&
        typeof content.primaryCta === "string" &&
        typeof content.secondaryCta === "string");
}
function parseSlideInput(value) {
    if (!value || typeof value !== "object")
        return null;
    const slide = value;
    if (typeof slide.slideId !== "string" ||
        typeof slide.imageUrl !== "string" ||
        typeof slide.primaryHref !== "string" ||
        typeof slide.secondaryHref !== "string" ||
        !isLocaleContent(slide.contentEn) ||
        !isLocaleContent(slide.contentBn)) {
        return null;
    }
    return {
        slideId: slide.slideId.trim(),
        sortOrder: typeof slide.sortOrder === "number" ? slide.sortOrder : undefined,
        imageUrl: slide.imageUrl.trim(),
        imagePublicId: typeof slide.imagePublicId === "string"
            ? slide.imagePublicId.trim()
            : undefined,
        imageObjectPosition: typeof slide.imageObjectPosition === "string"
            ? slide.imageObjectPosition.trim()
            : undefined,
        imageScale: typeof slide.imageScale === "number" ? slide.imageScale : undefined,
        primaryHref: slide.primaryHref.trim(),
        secondaryHref: slide.secondaryHref.trim(),
        theme: slide.theme === "dark" ? "dark" : "light",
        showOnWebsite: typeof slide.showOnWebsite === "boolean" ? slide.showOnWebsite : true,
        contentEn: slide.contentEn,
        contentBn: slide.contentBn,
    };
}
const adminGetHomeHeroSlides = async (_req, res) => {
    try {
        const slides = await (0, homeHeroService_1.listAdminHomeHeroSlides)();
        res.status(200).json({
            success: true,
            message: "Home hero slides fetched successfully",
            data: { slides },
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to fetch home hero slides",
            data: null,
        });
    }
};
exports.adminGetHomeHeroSlides = adminGetHomeHeroSlides;
const adminSaveHomeHeroSlides = async (req, res) => {
    try {
        const rawSlides = req.body?.slides;
        if (!Array.isArray(rawSlides) || rawSlides.length === 0) {
            res.status(400).json({
                success: false,
                message: "At least one slide is required",
                data: null,
            });
            return;
        }
        const slides = rawSlides
            .map((item) => parseSlideInput(item))
            .filter((item) => item !== null);
        if (slides.length !== rawSlides.length) {
            res.status(400).json({
                success: false,
                message: "Invalid slide payload",
                data: null,
            });
            return;
        }
        const saved = await (0, homeHeroService_1.saveHomeHeroSlides)(slides);
        res.status(200).json({
            success: true,
            message: "Home hero saved successfully",
            data: { slides: saved },
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to save home hero",
            data: null,
        });
    }
};
exports.adminSaveHomeHeroSlides = adminSaveHomeHeroSlides;
