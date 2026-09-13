"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSiteSettings = exports.getSiteSettings = void 0;
const SiteSettings_1 = require("../models/SiteSettings");
const getSiteSettings = async (_req, res) => {
    try {
        let settings = await SiteSettings_1.SiteSettings.findOne({});
        if (!settings) {
            settings = await SiteSettings_1.SiteSettings.create({ isTeacherApplicationOpen: false });
        }
        res.status(200).json({
            success: true,
            message: "Site settings fetched",
            data: settings,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch site settings",
            data: null,
        });
    }
};
exports.getSiteSettings = getSiteSettings;
const updateSiteSettings = async (req, res) => {
    try {
        const { isTeacherApplicationOpen } = req.body;
        let settings = await SiteSettings_1.SiteSettings.findOne({});
        if (!settings) {
            settings = new SiteSettings_1.SiteSettings({ isTeacherApplicationOpen: false });
        }
        if (typeof isTeacherApplicationOpen === "boolean") {
            settings.isTeacherApplicationOpen = isTeacherApplicationOpen;
        }
        await settings.save();
        res.status(200).json({
            success: true,
            message: "Site settings updated",
            data: settings,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to update site settings",
            data: null,
        });
    }
};
exports.updateSiteSettings = updateSiteSettings;
