import { Request, Response } from "express";
import mongoose from "mongoose";
import type { NewsletterSubscriberStatus } from "../models/NewsletterSubscriber";
import {
  createNewsletterSubscriber,
  listNewsletterSubscribers,
  updateNewsletterSubscriberStatus,
} from "../services/newsletterSubscriberService";

function parseStatus(value: unknown): NewsletterSubscriberStatus | undefined {
  if (value === "active" || value === "unsubscribed") return value;
  return undefined;
}

function parseLocale(value: unknown): "en" | "bn" | undefined {
  if (value === "en" || value === "bn") return value;
  return undefined;
}

export const submitNewsletterSubscriber = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const result = await createNewsletterSubscriber({
      email: req.body.email,
      locale: parseLocale(req.body.locale),
      source: typeof req.body.source === "string" ? req.body.source : undefined,
    });

    if ("error" in result) {
      res.status(400).json({ success: false, message: result.error, data: null });
      return;
    }

    const { subscriber, created } = result;

    res.status(created ? 201 : 200).json({
      success: true,
      message: created
        ? "Subscribed successfully. JazakAllahu khairan."
        : "You are already on our newsletter list.",
      data: {
        id: subscriber._id,
        status: subscriber.status,
        created,
      },
    });
  } catch (err) {
    console.error("[newsletter] submit failed:", err);
    res.status(500).json({
      success: false,
      message: "Failed to subscribe",
      data: null,
    });
  }
};

export const listAdminNewsletterSubscribers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const status = parseStatus(req.query.status);
    if (req.query.status && !status) {
      res.status(400).json({
        success: false,
        message: "Invalid status filter",
        data: null,
      });
      return;
    }

    const data = await listNewsletterSubscribers(status);
    res.status(200).json({
      success: true,
      message: "Newsletter subscribers fetched",
      data,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch newsletter subscribers",
      data: null,
    });
  }
};

export const patchAdminNewsletterSubscriberStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const status = parseStatus(req.body.status);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid subscriber ID",
        data: null,
      });
      return;
    }

    if (!status) {
      res.status(400).json({
        success: false,
        message: "status must be active or unsubscribed",
        data: null,
      });
      return;
    }

    const result = await updateNewsletterSubscriberStatus(id, status);

    if ("error" in result) {
      res.status(404).json({ success: false, message: result.error, data: null });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Subscriber updated",
      data: result.subscriber,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to update subscriber",
      data: null,
    });
  }
};
