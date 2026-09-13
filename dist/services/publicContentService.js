"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listPublicTeachers = listPublicTeachers;
exports.getPublicTeacherBySlug = getPublicTeacherBySlug;
exports.getPublicStats = getPublicStats;
exports.getPublicProgressHighlights = getPublicProgressHighlights;
const ClassLog_1 = require("../models/ClassLog");
const Progress_1 = require("../models/Progress");
const TeacherProfile_1 = require("../models/TeacherProfile");
const User_1 = require("../models/User");
const ACADEMY_FOUNDED_YEAR = 2019;
const AYAH_PER_JUZ = 200;
function mapTeacherProfile(doc) {
    return {
        id: String(doc._id),
        slug: doc.slug,
        name: doc.name,
        role: doc.role,
        bio: doc.bio,
        image: doc.avatarUrl?.trim() ?? "",
        gender: doc.gender,
        country: doc.country || undefined,
        featured: doc.featured,
        about: doc.about || undefined,
        dateOfBirth: doc.dateOfBirth || undefined,
        age: doc.age || undefined,
        address: doc.address || undefined,
        location: doc.location || undefined,
        qualifications: doc.qualifications.length > 0 ? doc.qualifications : undefined,
        skills: doc.skills.length > 0 ? doc.skills : undefined,
        experience: doc.experience || undefined,
        languages: doc.languages.length > 0 ? doc.languages : undefined,
        courseSlugs: doc.courseSlugs.length > 0 ? doc.courseSlugs : undefined,
    };
}
function formatUnitLabel(unitId, index) {
    if (!unitId)
        return `Juz ${index + 1}`;
    if (/juz/i.test(unitId) || /^jz-/i.test(unitId)) {
        const num = unitId.replace(/\D/g, "");
        return num ? `Juz ${num}` : `Juz ${index + 1}`;
    }
    if (/hifz/i.test(unitId))
        return `Hifz ${index + 1}`;
    return `Unit ${index + 1}`;
}
async function listPublicTeachers(filters) {
    const query = { showOnWebsite: true };
    if (filters?.gender) {
        query.gender = filters.gender;
    }
    if (filters?.featured === true) {
        query.featured = true;
    }
    const docs = await TeacherProfile_1.TeacherProfile.find(query)
        .sort({ featured: -1, sortOrder: 1, name: 1 })
        .lean();
    return docs.map((doc) => mapTeacherProfile(doc));
}
async function getPublicTeacherBySlug(slug) {
    const doc = await TeacherProfile_1.TeacherProfile.findOne({
        slug: slug.toLowerCase(),
        showOnWebsite: true,
    }).lean();
    if (!doc)
        return null;
    return mapTeacherProfile(doc);
}
async function getPublicStats() {
    const [totalStudents, portalTeachers, websiteTeachers, featuredTeachers, approvedMinutes,] = await Promise.all([
        User_1.User.countDocuments({ role: "student", isActive: true }),
        User_1.User.countDocuments({ role: "teacher", isActive: true }),
        TeacherProfile_1.TeacherProfile.countDocuments({ showOnWebsite: true }),
        TeacherProfile_1.TeacherProfile.countDocuments({ showOnWebsite: true, featured: true }),
        ClassLog_1.ClassLog.aggregate([
            { $match: { status: "approved" } },
            { $group: { _id: null, total: { $sum: "$durationMinutes" } } },
        ]),
    ]);
    const minutes = approvedMinutes[0]?.total ?? 0;
    const totalTeachingHours = Math.max(0, Math.round(minutes / 60));
    const yearsExperience = Math.max(1, new Date().getFullYear() - ACADEMY_FOUNDED_YEAR);
    return {
        totalTeachingHours,
        yearsExperience,
        totalTeachers: websiteTeachers > 0 ? websiteTeachers : portalTeachers,
        totalStudents: Math.max(300, totalStudents),
        featuredTeachers,
    };
}
async function getPublicProgressHighlights() {
    const grouped = await Progress_1.Progress.aggregate([
        {
            $match: {
                $or: [
                    { memorizedAyahs: { $gt: 0 } },
                    { tajweedScore: { $gt: 0 } },
                ],
            },
        },
        {
            $group: {
                _id: { $ifNull: ["$curriculumUnit", "$curriculumProgram"] },
                avgScore: { $avg: "$tajweedScore" },
                avgAyahs: { $avg: "$memorizedAyahs" },
                count: { $sum: 1 },
            },
        },
        { $sort: { count: -1, avgAyahs: -1 } },
        { $limit: 3 },
    ]);
    if (grouped.length === 0) {
        return { items: [], hasData: false };
    }
    const items = grouped.map((row, index) => {
        const fromAyahs = Math.round(((row.avgAyahs ?? 0) / AYAH_PER_JUZ) * 100);
        const fromScore = Math.round(row.avgScore ?? 0);
        const percent = Math.min(100, Math.max(fromScore, fromAyahs));
        return {
            label: formatUnitLabel(row._id, index),
            percent,
        };
    });
    return { items, hasData: true };
}
