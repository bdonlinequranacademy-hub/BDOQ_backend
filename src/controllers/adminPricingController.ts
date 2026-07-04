import { Request, Response } from "express";
import mongoose from "mongoose";
import { IPricingPackage, PricingPackage } from "../models/PricingPackage";

const formatPricingPackage = (doc: IPricingPackage) => ({
  id: doc._id.toString(),
  slug: doc.slug,
  name: doc.name,
  priceBdt: doc.priceBdt,
  priceUsd: doc.priceUsd,
  period: doc.period,
  features: doc.features,
  popular: doc.popular,
  sortOrder: doc.sortOrder,
  showOnWebsite: doc.showOnWebsite,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

function buildSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return base || `package-${Date.now()}`;
}

function parseFeatures(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }
  return [];
}

export const adminGetPricingPackages = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const docs = await PricingPackage.find().sort({
      sortOrder: 1,
      createdAt: -1,
    });
    res.status(200).json({
      success: true,
      message: "Pricing packages fetched successfully",
      data: docs.map((doc) => formatPricingPackage(doc)),
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch pricing packages",
      data: null,
    });
  }
};

export const adminGetPricingPackageById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid pricing package id",
        data: null,
      });
      return;
    }

    const doc = await PricingPackage.findById(id);
    if (!doc) {
      res.status(404).json({
        success: false,
        message: "Pricing package not found",
        data: null,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Pricing package fetched successfully",
      data: formatPricingPackage(doc),
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch pricing package",
      data: null,
    });
  }
};

export const adminCreatePricingPackage = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      slug,
      name,
      priceBdt,
      priceUsd,
      period,
      features,
      popular,
      sortOrder,
      showOnWebsite,
    } = req.body as Record<string, unknown>;

    if (typeof name !== "string" || !name.trim()) {
      res.status(400).json({
        success: false,
        message: "Package name is required",
        data: null,
      });
      return;
    }

    if (typeof priceBdt !== "number" || priceBdt < 0) {
      res.status(400).json({
        success: false,
        message: "Valid BDT price is required",
        data: null,
      });
      return;
    }

    if (typeof priceUsd !== "number" || priceUsd < 0) {
      res.status(400).json({
        success: false,
        message: "Valid USD price is required",
        data: null,
      });
      return;
    }

    const parsedFeatures = parseFeatures(features);
    if (parsedFeatures.length === 0) {
      res.status(400).json({
        success: false,
        message: "At least one feature is required",
        data: null,
      });
      return;
    }

    const resolvedSlug =
      typeof slug === "string" && slug.trim()
        ? slug.trim().toLowerCase()
        : buildSlug(name);

    const doc = await PricingPackage.create({
      slug: resolvedSlug,
      name: name.trim(),
      priceBdt,
      priceUsd,
      period:
        typeof period === "string" && period.trim() ? period.trim() : "Monthly",
      features: parsedFeatures,
      popular: popular === true,
      sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
      showOnWebsite: showOnWebsite !== false,
    });

    res.status(201).json({
      success: true,
      message: "Pricing package created successfully",
      data: formatPricingPackage(doc),
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message.includes("duplicate")
        ? "A package with this slug already exists"
        : "Failed to create pricing package";
    res.status(500).json({ success: false, message, data: null });
  }
};

export const adminUpdatePricingPackage = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid pricing package id",
        data: null,
      });
      return;
    }

    const doc = await PricingPackage.findById(id);
    if (!doc) {
      res.status(404).json({
        success: false,
        message: "Pricing package not found",
        data: null,
      });
      return;
    }

    const body = req.body as Record<string, unknown>;
    if (typeof body.slug === "string" && body.slug.trim()) {
      doc.slug = body.slug.trim().toLowerCase();
    }
    if (typeof body.name === "string" && body.name.trim()) {
      doc.name = body.name.trim();
    }
    if (typeof body.priceBdt === "number" && body.priceBdt >= 0) {
      doc.priceBdt = body.priceBdt;
    }
    if (typeof body.priceUsd === "number" && body.priceUsd >= 0) {
      doc.priceUsd = body.priceUsd;
    }
    if (typeof body.period === "string" && body.period.trim()) {
      doc.period = body.period.trim();
    }
    if (body.features !== undefined) {
      const parsedFeatures = parseFeatures(body.features);
      if (parsedFeatures.length === 0) {
        res.status(400).json({
          success: false,
          message: "At least one feature is required",
          data: null,
        });
        return;
      }
      doc.features = parsedFeatures;
    }
    if (typeof body.popular === "boolean") {
      doc.popular = body.popular;
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
      message: "Pricing package updated successfully",
      data: formatPricingPackage(doc),
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message.includes("duplicate")
        ? "A package with this slug already exists"
        : "Failed to update pricing package";
    res.status(500).json({ success: false, message, data: null });
  }
};

export const adminDeletePricingPackage = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid pricing package id",
        data: null,
      });
      return;
    }

    const doc = await PricingPackage.findByIdAndDelete(id);
    if (!doc) {
      res.status(404).json({
        success: false,
        message: "Pricing package not found",
        data: null,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Pricing package deleted successfully",
      data: null,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to delete pricing package",
      data: null,
    });
  }
};
