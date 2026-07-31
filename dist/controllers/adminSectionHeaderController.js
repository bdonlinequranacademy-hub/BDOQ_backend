"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminUpsertSectionHeader = exports.adminSaveSectionHeaders = exports.adminGetSectionHeaders = void 0;
const sectionHeaderService_1 = require("../services/sectionHeaderService");
function isLocaleContent(value) {
    if (!value || typeof value !== "object")
        return false;
    const content = value;
    return typeof content.title === "string";
}
function parseHeaderInput(value) {
    if (!value || typeof value !== "object")
        return null;
    const header = value;
    if (typeof header.sectionKey !== "string" ||
        typeof header.label !== "string" ||
        !isLocaleContent(header.contentEn) ||
        !isLocaleContent(header.contentBn)) {
        return null;
    }
    return {
        sectionKey: header.sectionKey.trim(),
        label: header.label.trim(),
        sortOrder: typeof header.sortOrder === "number" ? header.sortOrder : undefined,
        showOnWebsite: typeof header.showOnWebsite === "boolean"
            ? header.showOnWebsite
            : true,
        contentEn: header.contentEn,
        contentBn: header.contentBn,
    };
}
const adminGetSectionHeaders = async (_req, res) => {
    try {
        const headers = await (0, sectionHeaderService_1.listAdminSectionHeaders)();
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
exports.adminGetSectionHeaders = adminGetSectionHeaders;
const adminSaveSectionHeaders = async (req, res) => {
    try {
        const rawHeaders = req.body?.headers;
        if (!Array.isArray(rawHeaders)) {
            res.status(400).json({
                success: false,
                message: "headers array is required",
                data: null,
            });
            return;
        }
        const headers = rawHeaders
            .map((item) => parseHeaderInput(item))
            .filter((item) => item !== null);
        if (headers.length !== rawHeaders.length) {
            res.status(400).json({
                success: false,
                message: "Invalid section header payload",
                data: null,
            });
            return;
        }
        const saved = await (0, sectionHeaderService_1.saveSectionHeaders)(headers);
        res.status(200).json({
            success: true,
            message: "Section headers saved successfully",
            data: { headers: saved },
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to save section headers",
            data: null,
        });
    }
};
exports.adminSaveSectionHeaders = adminSaveSectionHeaders;
const adminUpsertSectionHeader = async (req, res) => {
    try {
        const parsed = parseHeaderInput(req.body?.header ?? req.body);
        if (!parsed) {
            res.status(400).json({
                success: false,
                message: "Invalid section header payload",
                data: null,
            });
            return;
        }
        const saved = await (0, sectionHeaderService_1.upsertSectionHeader)(parsed);
        res.status(200).json({
            success: true,
            message: "Section header saved successfully",
            data: { header: saved },
        });
    }
    catch {
        res.status(500).json({
            success: false,
            message: "Failed to save section header",
            data: null,
        });
    }
};
exports.adminUpsertSectionHeader = adminUpsertSectionHeader;
