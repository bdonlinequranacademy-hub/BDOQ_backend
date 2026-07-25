import { Request, Response } from "express";
import mongoose from "mongoose";
import { FaqItem, type IFaqItem } from "../models/FaqItem";

const formatFaqItem = (doc: IFaqItem) => ({
  id: doc._id.toString(),
  externalId: doc.externalId,
  question: doc.question,
  answer: doc.answer,
  sortOrder: doc.sortOrder,
  showOnWebsite: doc.showOnWebsite,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

function buildExternalId(): string {
  return `faq-${Date.now()}`;
}

export const adminGetFaqItems = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const docs = await FaqItem.find().sort({ sortOrder: 1, createdAt: -1 });
    res.status(200).json({
      success: true,
      message: "FAQ items fetched successfully",
      data: docs.map((doc) => formatFaqItem(doc)),
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch FAQ items",
      data: null,
    });
  }
};

export const adminGetFaqItemById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid FAQ item id",
        data: null,
      });
      return;
    }

    const doc = await FaqItem.findById(id);
    if (!doc) {
      res.status(404).json({
        success: false,
        message: "FAQ item not found",
        data: null,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "FAQ item fetched successfully",
      data: formatFaqItem(doc),
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch FAQ item",
      data: null,
    });
  }
};

export const adminCreateFaqItem = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { externalId, question, answer, sortOrder, showOnWebsite } =
      req.body as Record<string, unknown>;

    if (typeof question !== "string" || !question.trim()) {
      res.status(400).json({
        success: false,
        message: "FAQ question is required",
        data: null,
      });
      return;
    }

    if (typeof answer !== "string" || !answer.trim()) {
      res.status(400).json({
        success: false,
        message: "FAQ answer is required",
        data: null,
      });
      return;
    }

    const resolvedExternalId =
      typeof externalId === "string" && externalId.trim()
        ? externalId.trim()
        : buildExternalId();

    const doc = await FaqItem.create({
      externalId: resolvedExternalId,
      question: question.trim(),
      answer: answer.trim(),
      sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
      showOnWebsite: showOnWebsite !== false,
    });

    res.status(201).json({
      success: true,
      message: "FAQ item created successfully",
      data: formatFaqItem(doc),
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message.includes("duplicate")
        ? "An FAQ item with this external id already exists"
        : "Failed to create FAQ item";
    res.status(500).json({ success: false, message, data: null });
  }
};

export const adminUpdateFaqItem = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid FAQ item id",
        data: null,
      });
      return;
    }

    const doc = await FaqItem.findById(id);
    if (!doc) {
      res.status(404).json({
        success: false,
        message: "FAQ item not found",
        data: null,
      });
      return;
    }

    const body = req.body as Record<string, unknown>;

    if (typeof body.externalId === "string" && body.externalId.trim()) {
      doc.externalId = body.externalId.trim();
    }
    if (typeof body.question === "string" && body.question.trim()) {
      doc.question = body.question.trim();
    }
    if (typeof body.answer === "string" && body.answer.trim()) {
      doc.answer = body.answer.trim();
    }
    if (typeof body.sortOrder === "number") {
      doc.sortOrder = body.sortOrder;
    }
    if (typeof body.showOnWebsite === "boolean") {
      doc.showOnWebsite = body.showOnWebsite;
    }

    await doc.save();

    res.status(200).json({
      success: true,
      message: "FAQ item updated successfully",
      data: formatFaqItem(doc),
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message.includes("duplicate")
        ? "An FAQ item with this external id already exists"
        : "Failed to update FAQ item";
    res.status(500).json({ success: false, message, data: null });
  }
};

export const adminDeleteFaqItem = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid FAQ item id",
        data: null,
      });
      return;
    }

    const doc = await FaqItem.findByIdAndDelete(id);
    if (!doc) {
      res.status(404).json({
        success: false,
        message: "FAQ item not found",
        data: null,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "FAQ item deleted successfully",
      data: null,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to delete FAQ item",
      data: null,
    });
  }
};
