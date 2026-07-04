import { Request, Response } from "express";
import {
  EBOOK_CATEGORIES,
  IResource,
  RESOURCE_TYPES,
  Resource,
  type EbookCategory,
  type ResourceType,
} from "../models/Resource";

const CACHE_HEADER = "public, s-maxage=3600, stale-while-revalidate=86400";

function applyLocale(resource: IResource, locale: string) {
  const bn =
    locale === "bn" && resource.translations?.bn
      ? resource.translations.bn
      : undefined;

  return {
    id: resource._id.toString(),
    type: resource.type,
    section: resource.section,
    slug: resource.slug,
    title: bn?.title ?? resource.title,
    description: bn?.description ?? resource.description,
    featured: resource.featured,
    sortOrder: resource.sortOrder,
    category: resource.category,
    coverGradient: resource.coverGradient,
    coverUrl: resource.coverUrl,
    pdfUrl: resource.pdfUrl,
    fileSize: resource.fileSize,
    pageCount: resource.pageCount,
    language: resource.language,
    author: resource.author,
    audioUrl: resource.audioUrl,
    duration: resource.duration,
    paraInfo: resource.paraInfo,
    surahName: resource.surahName,
    progress: resource.progress,
    verses: resource.verses,
    youtubeId: resource.youtubeId,
    startSeconds: resource.startSeconds,
    publishedAt: resource.publishedAt,
  };
}

function setCache(res: Response): void {
  res.setHeader("Cache-Control", CACHE_HEADER);
}

function isValidType(value: string): value is ResourceType {
  return RESOURCE_TYPES.includes(value as ResourceType);
}

/** GET /api/resources/:type — published resources by type */
export const getPublishedResources = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { type } = req.params;
    const { section, category, locale = "en" } = req.query;

    if (!isValidType(type)) {
      res.status(400).json({
        success: false,
        message: "Invalid resource type",
        data: null,
      });
      return;
    }

    const filter: Record<string, unknown> = {
      type,
      status: "published",
    };

    if (section) filter.section = String(section);
    if (category) {
      if (!EBOOK_CATEGORIES.includes(category as EbookCategory)) {
        res.status(400).json({
          success: false,
          message: "Invalid category",
          data: null,
        });
        return;
      }
      filter.category = String(category);
    }

    const items = await Resource.find(filter)
      .sort({ featured: -1, sortOrder: 1, createdAt: -1 })
      .lean<IResource[]>();

    setCache(res);
    res.status(200).json({
      success: true,
      message: "Resources fetched successfully",
      data: {
        items: items.map((item) => applyLocale(item, String(locale))),
      },
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch resources",
      data: null,
    });
  }
};

/** GET /api/resources/:type/:slug — single published resource */
export const getPublishedResourceBySlug = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { type, slug } = req.params;
    const { locale = "en" } = req.query;

    if (!isValidType(type)) {
      res.status(400).json({
        success: false,
        message: "Invalid resource type",
        data: null,
      });
      return;
    }

    const item = await Resource.findOne({
      type,
      slug: slug.toLowerCase(),
      status: "published",
    }).lean<IResource>();

    if (!item) {
      res.status(404).json({
        success: false,
        message: "Resource not found",
        data: null,
      });
      return;
    }

    setCache(res);
    res.status(200).json({
      success: true,
      message: "Resource fetched successfully",
      data: applyLocale(item, String(locale)),
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch resource",
      data: null,
    });
  }
};
