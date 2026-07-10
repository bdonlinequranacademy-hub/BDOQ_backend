"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listPublicCourses = listPublicCourses;
exports.getPublicCourseBySlug = getPublicCourseBySlug;
exports.listPublicPricing = listPublicPricing;
exports.listPublicTestimonials = listPublicTestimonials;
exports.listPublicFaq = listPublicFaq;
exports.listPublicGallery = listPublicGallery;
exports.getPublicWeeklySchedulePreview = getPublicWeeklySchedulePreview;
const CourseCatalog_1 = require("../models/CourseCatalog");
const FaqItem_1 = require("../models/FaqItem");
const GalleryItem_1 = require("../models/GalleryItem");
const PricingPackage_1 = require("../models/PricingPackage");
const SessionSlot_1 = require("../models/SessionSlot");
const Testimonial_1 = require("../models/Testimonial");
const WEEKDAY_SHORT = [
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat",
    "Sun",
];
const DAY_TO_SHORT = {
    Monday: "Mon",
    Tuesday: "Tue",
    Wednesday: "Wed",
    Thursday: "Thu",
    Friday: "Fri",
    Saturday: "Sat",
    Sunday: "Sun",
};
function mapCourse(doc) {
    return {
        slug: doc.slug,
        title: doc.title,
        description: doc.description,
        icon: doc.icon,
        target: doc.target || undefined,
        category: doc.category,
        gender: doc.gender || undefined,
        detail: doc.detail,
    };
}
async function listPublicCourses(filters) {
    const query = { showOnWebsite: true };
    if (filters?.category)
        query.category = filters.category;
    if (filters?.gender)
        query.gender = filters.gender;
    const docs = await CourseCatalog_1.CourseCatalog.find(query)
        .sort({ sortOrder: 1, title: 1 })
        .lean();
    return docs.map((doc) => mapCourse(doc));
}
async function getPublicCourseBySlug(slug) {
    const doc = await CourseCatalog_1.CourseCatalog.findOne({
        slug: slug.toLowerCase(),
        showOnWebsite: true,
    }).lean();
    if (!doc)
        return null;
    return mapCourse(doc);
}
async function listPublicPricing() {
    const docs = await PricingPackage_1.PricingPackage.find({ showOnWebsite: true })
        .sort({ sortOrder: 1 })
        .lean();
    return docs.map((doc) => ({
        slug: doc.slug,
        name: doc.name,
        price: { bdt: doc.priceBdt, usd: doc.priceUsd },
        period: doc.period,
        features: doc.features,
        popular: doc.popular || undefined,
    }));
}
async function listPublicTestimonials() {
    const docs = await Testimonial_1.Testimonial.find({ showOnWebsite: true })
        .sort({ sortOrder: 1 })
        .lean();
    return docs.map((doc) => ({
        id: doc.externalId,
        name: doc.name,
        role: doc.role,
        location: doc.location,
        content: doc.content,
        rating: doc.rating,
        image: doc.image || undefined,
        mediaType: doc.mediaType ?? "text",
        mediaUrl: doc.mediaUrl || undefined,
        youtubeId: doc.youtubeId || undefined,
    }));
}
async function listPublicFaq() {
    const docs = await FaqItem_1.FaqItem.find({ showOnWebsite: true })
        .sort({ sortOrder: 1 })
        .lean();
    return docs.map((doc) => ({
        id: doc.externalId,
        question: doc.question,
        answer: doc.answer,
    }));
}
async function listPublicGallery() {
    const docs = await GalleryItem_1.GalleryItem.find({ showOnWebsite: true })
        .sort({ sortOrder: 1 })
        .lean();
    return docs.map((doc) => ({
        id: doc.externalId,
        title: doc.title,
        description: doc.description || undefined,
        album: doc.album,
        mediaType: doc.mediaType ?? "photo",
        mediaUrl: doc.mediaUrl?.trim() || doc.imageUrl?.trim() || undefined,
        youtubeId: doc.youtubeId?.trim() || undefined,
        coverGradient: doc.coverGradient,
        heightClass: doc.heightClass,
        imageUrl: doc.mediaUrl?.trim() || doc.imageUrl?.trim() || undefined,
    }));
}
async function getPublicWeeklySchedulePreview() {
    const grouped = await SessionSlot_1.SessionSlot.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: "$day", count: { $sum: 1 } } },
    ]);
    const countByShort = new Map();
    for (const row of grouped) {
        const short = DAY_TO_SHORT[row._id];
        if (short)
            countByShort.set(short, row.count);
    }
    const days = WEEKDAY_SHORT.map((day) => ({
        day,
        hasSessions: (countByShort.get(day) ?? 0) > 0,
        sessionCount: countByShort.get(day) ?? 0,
    }));
    return {
        days,
        hasData: days.some((day) => day.hasSessions),
    };
}
