import { Request, Response } from "express";
import {
  getLiveMonitorPayload,
  getPublicLiveDashboard,
} from "../services/liveMonitorService";

export const getAdminLiveMonitor = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const data = await getLiveMonitorPayload();
    res.status(200).json({
      success: true,
      message: "Live monitor data fetched successfully",
      data,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch live monitor data",
      data: null,
    });
  }
};

/** Public marketing snapshot — no auth, no meeting links or PII. */
export const getPublicLiveDashboardHandler = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const data = await getPublicLiveDashboard();
    res.status(200).json({
      success: true,
      message: "Live dashboard snapshot fetched successfully",
      data,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch live dashboard snapshot",
      data: null,
    });
  }
};
