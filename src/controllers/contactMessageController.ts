import { Request, Response } from "express";
import mongoose from "mongoose";
import type { ContactMessageStatus } from "../models/ContactMessage";
import {
  createContactMessage,
  listContactMessages,
  updateContactMessageStatus,
} from "../services/contactMessageService";

function parseContactStatus(value: unknown): ContactMessageStatus | undefined {
  if (value === "new" || value === "replied" || value === "closed") return value;
  return undefined;
}

function parseLocale(value: unknown): "en" | "bn" | undefined {
  if (value === "en" || value === "bn") return value;
  return undefined;
}

export const submitContactMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await createContactMessage({
      name: req.body.name,
      email: req.body.email,
      message: req.body.message,
      locale: parseLocale(req.body.locale),
    });

    if ("error" in result) {
      res.status(400).json({ success: false, message: result.error, data: null });
      return;
    }

    const { message } = result;

    res.status(201).json({
      success: true,
      message: "Message received. We'll reply within 24 hours.",
      data: { id: message._id, status: message.status },
    });
  } catch (err) {
    console.error("[contact] submit failed:", err);
    res.status(500).json({
      success: false,
      message: "Failed to send message",
      data: null,
    });
  }
};

export const listAdminContactMessages = async (req: Request, res: Response): Promise<void> => {
  try {
    const status = parseContactStatus(req.query.status);
    if (req.query.status && !status) {
      res.status(400).json({
        success: false,
        message: "Invalid status filter",
        data: null,
      });
      return;
    }

    const data = await listContactMessages(status);
    res.status(200).json({
      success: true,
      message: "Contact messages fetched",
      data,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch contact messages",
      data: null,
    });
  }
};

export const patchAdminContactMessageStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const status = parseContactStatus(req.body.status);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid message ID",
        data: null,
      });
      return;
    }

    if (!status) {
      res.status(400).json({
        success: false,
        message: "status must be new, replied, or closed",
        data: null,
      });
      return;
    }

    const result = await updateContactMessageStatus(id, status);

    if ("error" in result) {
      res.status(404).json({ success: false, message: result.error, data: null });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Contact message updated",
      data: result.message,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to update contact message",
      data: null,
    });
  }
};
