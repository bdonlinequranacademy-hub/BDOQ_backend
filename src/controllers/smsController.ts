import { Request, Response } from "express";
import { sendSMS, isSmsConfigured } from "../services/smsService";

export const sendAdminSMS = async (req: Request, res: Response): Promise<void> => {
  try {
    const { number, message } = req.body;

    if (!isSmsConfigured()) {
      res.status(503).json({
        success: false,
        message: "SMS service is not configured on the server",
        data: null,
      });
      return;
    }

    if (!number || typeof number !== "string" || number.trim() === "") {
      res.status(400).json({
        success: false,
        message: "Phone number is required",
        data: null,
      });
      return;
    }

    if (!message || typeof message !== "string" || message.trim() === "") {
      res.status(400).json({
        success: false,
        message: "Message content is required",
        data: null,
      });
      return;
    }

    const trimmedNumber = number.trim();
    const trimmedMessage = message.trim();

    // Basic BD Phone Number validation:
    // Should be at least 11 digits, starting with 01, optionally prefixed with +88 or 88
    const phoneRegex = /^(?:\+88|88)?01[3-9]\d{8}$/;
    if (!phoneRegex.test(trimmedNumber)) {
      res.status(400).json({
        success: false,
        message: "Invalid Bangladeshi phone number format",
        data: null,
      });
      return;
    }

    const result = await sendSMS(trimmedNumber, trimmedMessage);

    if (result.success) {
      res.status(200).json({
        success: true,
        message: result.message,
        data: null,
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
        data: null,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "An internal server error occurred while sending SMS",
      data: null,
    });
  }
};
