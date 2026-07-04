"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_PERFORMANCE_BN = exports.DEFAULT_PERFORMANCE_EN = void 0;
exports.buildVerifyUrl = buildVerifyUrl;
exports.formatCertificate = formatCertificate;
exports.generateCertificateId = generateCertificateId;
exports.shouldShowExcellentBadge = shouldShowExcellentBadge;
const Certificate_1 = require("../models/Certificate");
const academyBrand_1 = require("../lib/academyBrand");
exports.DEFAULT_PERFORMANCE_EN = "For excellent performance, dedication, and good Islamic manners throughout the course.";
exports.DEFAULT_PERFORMANCE_BN = "কোর্স চলাকালীন চমৎকার পারফরম্যান্স, নিষ্ঠা এবং উত্তম ইসলামী আচরণের জন্য।";
const FOUNDER_NAME = "Hafez Mawlana Mufti Abdul Mumin Khan";
const FOUNDER_TITLE = "Founder & Director, BD Online Quran Academy";
const SINCE_YEAR = "2019";
function buildVerifyUrl(certificateId) {
    const base = (process.env.CLIENT_URL ||
        process.env.PUBLIC_SITE_URL ||
        academyBrand_1.ACADEMY_BRAND.website).replace(/\/$/, "");
    return `${base}/verify-certificate/${encodeURIComponent(certificateId)}`;
}
function formatCertificate(doc) {
    return {
        id: doc._id.toString(),
        certificateId: doc.certificateId,
        studentName: doc.studentName,
        studentNameBn: doc.studentNameBn,
        courseName: doc.courseName,
        courseNameBn: doc.courseNameBn,
        studentPortalId: doc.studentPortalId,
        issueDate: doc.issueDate.toISOString(),
        courseDuration: doc.courseDuration,
        grade: doc.grade,
        showExcellentBadge: doc.showExcellentBadge,
        performanceTextEn: doc.performanceTextEn || exports.DEFAULT_PERFORMANCE_EN,
        performanceTextBn: doc.performanceTextBn || exports.DEFAULT_PERFORMANCE_BN,
        verifyUrl: buildVerifyUrl(doc.certificateId),
        academy: {
            ...academyBrand_1.ACADEMY_BRAND,
            founderName: FOUNDER_NAME,
            founderTitle: FOUNDER_TITLE,
            sinceYear: SINCE_YEAR,
        },
        createdAt: doc.createdAt.toISOString(),
    };
}
async function generateCertificateId() {
    const year = new Date().getFullYear();
    const prefix = `BDOQ-${year}-`;
    const count = await Certificate_1.Certificate.countDocuments({
        certificateId: { $regex: `^${prefix}` },
    });
    return `${prefix}${String(count + 1).padStart(6, "0")}`;
}
function shouldShowExcellentBadge(grade) {
    const normalized = grade.trim().toLowerCase();
    return (/excellent|a\+|a\s*\+|outstanding|distinction/.test(normalized) ||
        normalized.startsWith("a+"));
}
