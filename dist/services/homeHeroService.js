"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listAdminHomeHeroSlides = listAdminHomeHeroSlides;
exports.listPublicHomeHeroSlides = listPublicHomeHeroSlides;
exports.saveHomeHeroSlides = saveHomeHeroSlides;
const HomeHeroSlide_1 = require("../models/HomeHeroSlide");
function formatAdminSlide(doc) {
    return {
        id: doc._id.toString(),
        slideId: doc.slideId,
        sortOrder: doc.sortOrder,
        imageUrl: doc.imageUrl,
        imagePublicId: doc.imagePublicId,
        imageObjectPosition: doc.imageObjectPosition,
        imageScale: doc.imageScale,
        primaryHref: doc.primaryHref,
        secondaryHref: doc.secondaryHref,
        theme: doc.theme,
        showOnWebsite: doc.showOnWebsite,
        contentEn: doc.contentEn,
        contentBn: doc.contentBn,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
    };
}
function pickLocaleContent(doc, locale) {
    return locale === "bn" ? doc.contentBn : doc.contentEn;
}
function formatPublicSlide(doc, locale) {
    const content = pickLocaleContent(doc, locale);
    return {
        id: doc.slideId,
        slideId: doc.slideId,
        sortOrder: doc.sortOrder,
        image: doc.imageUrl,
        imageObjectPosition: doc.imageObjectPosition,
        imageScale: doc.imageScale,
        primaryHref: doc.primaryHref,
        secondaryHref: doc.secondaryHref,
        theme: doc.theme,
        badge: content.badge,
        title: content.title,
        titleHighlight: content.titleHighlight,
        subtitle: content.subtitle,
        imageAlt: content.imageAlt,
        primaryCta: content.primaryCta,
        secondaryCta: content.secondaryCta,
    };
}
async function listAdminHomeHeroSlides() {
    const docs = await HomeHeroSlide_1.HomeHeroSlide.find().sort({ sortOrder: 1, createdAt: 1 });
    return docs.map((doc) => formatAdminSlide(doc));
}
async function listPublicHomeHeroSlides(locale) {
    const docs = await HomeHeroSlide_1.HomeHeroSlide.find({ showOnWebsite: true }).sort({
        sortOrder: 1,
        createdAt: 1,
    });
    return docs.map((doc) => formatPublicSlide(doc, locale));
}
async function saveHomeHeroSlides(slides) {
    const saved = [];
    for (const [index, slide] of slides.entries()) {
        const doc = await HomeHeroSlide_1.HomeHeroSlide.findOneAndUpdate({ slideId: slide.slideId }, {
            $set: {
                slideId: slide.slideId,
                sortOrder: slide.sortOrder ?? index,
                imageUrl: slide.imageUrl,
                imagePublicId: slide.imagePublicId,
                imageObjectPosition: slide.imageObjectPosition ?? "50% 25%",
                imageScale: slide.imageScale ?? 100,
                primaryHref: slide.primaryHref,
                secondaryHref: slide.secondaryHref,
                theme: slide.theme ?? "light",
                showOnWebsite: slide.showOnWebsite ?? true,
                contentEn: slide.contentEn,
                contentBn: slide.contentBn,
            },
        }, { upsert: true, new: true, runValidators: true });
        saved.push(doc);
    }
    const keepIds = slides.map((slide) => slide.slideId);
    await HomeHeroSlide_1.HomeHeroSlide.deleteMany({ slideId: { $nin: keepIds } });
    return saved
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((doc) => formatAdminSlide(doc));
}
