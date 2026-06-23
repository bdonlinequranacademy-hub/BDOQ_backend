import { Request, Response } from "express";
import {
  assessLogQuality,
  scanComplianceText,
} from "../services/complianceScanService";

export const scanTextHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { text, context } = req.body;

    if (typeof text !== "string") {
      res.status(400).json({
        success: false,
        message: "text is required",
        data: null,
      });
      return;
    }

    const compliance = scanComplianceText(text);
    let quality = null;
    if (context === "class_log") {
      quality = assessLogQuality(text);
    }

    res.status(200).json({
      success: true,
      message: "Scan complete",
      data: {
        compliance,
        quality,
        warnings: [
          ...(compliance.severity === "warn" ? [compliance.message] : []),
          ...(quality?.severity === "warn" ? [quality.message] : []),
        ].filter(Boolean),
      },
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to scan text",
      data: null,
    });
  }
};
