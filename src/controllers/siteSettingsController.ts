import { Request, Response } from "express";
import { SiteSettings } from "../models/SiteSettings";

export const getSiteSettings = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    let settings = await SiteSettings.findOne({});
    if (!settings) {
      settings = await SiteSettings.create({ isTeacherApplicationOpen: false });
    }

    res.status(200).json({
      success: true,
      message: "Site settings fetched",
      data: settings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch site settings",
      data: null,
    });
  }
};

export const updateSiteSettings = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { isTeacherApplicationOpen } = req.body;

    let settings = await SiteSettings.findOne({});
    if (!settings) {
      settings = new SiteSettings({ isTeacherApplicationOpen: false });
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
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update site settings",
      data: null,
    });
  }
};
