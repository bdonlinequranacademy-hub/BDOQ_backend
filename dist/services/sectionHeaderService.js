"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listAdminSectionHeaders = listAdminSectionHeaders;
exports.listPublicSectionHeaders = listPublicSectionHeaders;
exports.saveSectionHeaders = saveSectionHeaders;
exports.upsertSectionHeader = upsertSectionHeader;
const SiteSectionHeader_1 = require("../models/SiteSectionHeader");
function formatAdmin(doc) {
    return {
        id: doc._id.toString(),
        sectionKey: doc.sectionKey,
        label: doc.label,
        sortOrder: doc.sortOrder,
        showOnWebsite: doc.showOnWebsite,
        contentEn: doc.contentEn,
        contentBn: doc.contentBn,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
    };
}
function pickLocale(doc, locale) {
    return locale === "bn" ? doc.contentBn : doc.contentEn;
}
function formatPublic(doc, locale) {
    const content = pickLocale(doc, locale);
    return {
        sectionKey: doc.sectionKey,
        eyebrow: content.eyebrow,
        title: content.title,
        subtitle: content.subtitle,
        titleHighlight: content.titleHighlight,
        titleAccent: content.titleAccent,
        intro: content.intro,
    };
}
async function listAdminSectionHeaders() {
    const docs = await SiteSectionHeader_1.SiteSectionHeader.find().sort({
        sortOrder: 1,
        sectionKey: 1,
    });
    return docs.map((doc) => formatAdmin(doc));
}
async function listPublicSectionHeaders(locale, keys) {
    const filter = { showOnWebsite: true };
    if (keys && keys.length > 0) {
        filter.sectionKey = { $in: keys };
    }
    const docs = await SiteSectionHeader_1.SiteSectionHeader.find(filter).sort({
        sortOrder: 1,
        sectionKey: 1,
    });
    return docs.map((doc) => formatPublic(doc, locale));
}
async function saveSectionHeaders(headers) {
    const saved = [];
    for (const [index, header] of headers.entries()) {
        const doc = await SiteSectionHeader_1.SiteSectionHeader.findOneAndUpdate({ sectionKey: header.sectionKey }, {
            $set: {
                sectionKey: header.sectionKey,
                label: header.label,
                sortOrder: header.sortOrder ?? index,
                showOnWebsite: header.showOnWebsite ?? true,
                contentEn: header.contentEn,
                contentBn: header.contentBn,
            },
        }, { upsert: true, new: true, runValidators: true });
        saved.push(doc);
    }
    return saved
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((doc) => formatAdmin(doc));
}
async function upsertSectionHeader(header) {
    const [saved] = await saveSectionHeaders([header]);
    return saved;
}
