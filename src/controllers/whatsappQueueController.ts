import { Request, Response } from "express";
import { listWhatsAppQueue } from "../services/whatsappQueueService";

export const getWhatsAppQueue = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const items = await listWhatsAppQueue();
    res.status(200).json({
      success: true,
      message: "WhatsApp queue fetched",
      data: items,
    });
  } catch (err) {
    console.error("[admin] getWhatsAppQueue failed:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch WhatsApp queue",
      data: null,
    });
  }
};
