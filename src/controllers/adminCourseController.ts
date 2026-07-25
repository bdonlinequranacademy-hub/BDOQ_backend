import { Request, Response } from "express";
import mongoose from "mongoose";
import {
  CourseCatalog,
  type CourseCategoryType,
  type CourseGenderType,
  type ICourseBenefit,
  type ICourseCatalog,
  type ICourseDetailContent,
  type ICourseFaq,
  type ICourseModule,
} from "../models/CourseCatalog";

const COURSE_CATEGORIES = ["private", "record", "live", "free"] as const;
const COURSE_GENDERS = ["male", "female", "children"] as const;

const formatCourseCatalog = (doc: ICourseCatalog) => ({
  id: doc._id.toString(),
  slug: doc.slug,
  title: doc.title,
  description: doc.description,
  icon: doc.icon,
  target: doc.target,
  category: doc.category,
  gender: doc.gender,
  sortOrder: doc.sortOrder,
  showOnWebsite: doc.showOnWebsite,
  detail: doc.detail,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

function buildSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return base || `course-${Date.now()}`;
}

function isValidCategory(value: string): value is CourseCategoryType {
  return COURSE_CATEGORIES.includes(value as CourseCategoryType);
}

function isValidGender(value: string): value is CourseGenderType {
  return COURSE_GENDERS.includes(value as CourseGenderType);
}

function parseStringArray(value: unknown): string[] {
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

function parseBenefits(value: unknown): ICourseBenefit[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item, index) => ({
      id:
        typeof item.id === "string" && item.id.trim()
          ? item.id.trim()
          : `benefit-${index + 1}`,
      title: typeof item.title === "string" ? item.title.trim() : "",
      description:
        typeof item.description === "string" ? item.description.trim() : "",
      icon: typeof item.icon === "string" && item.icon.trim() ? item.icon.trim() : "✓",
    }))
    .filter((item) => item.title && item.description);
}

function parseModules(value: unknown): ICourseModule[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item, index) => ({
      id:
        typeof item.id === "string" && item.id.trim()
          ? item.id.trim()
          : `module-${index + 1}`,
      title: typeof item.title === "string" ? item.title.trim() : "",
      topics: parseStringArray(item.topics),
    }))
    .filter((item) => item.title);
}

function parseCourseFaqs(value: unknown): ICourseFaq[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item, index) => ({
      id:
        typeof item.id === "string" && item.id.trim()
          ? item.id.trim()
          : `faq-${index + 1}`,
      question: typeof item.question === "string" ? item.question.trim() : "",
      answer: typeof item.answer === "string" ? item.answer.trim() : "",
    }))
    .filter((item) => item.question && item.answer);
}

function defaultCourseDetail(): ICourseDetailContent {
  return {
    benefits: [],
    modules: [],
    audience: [],
    faqs: [],
    startingPriceBdt: 2000,
    recommendedPackage: "Basic",
  };
}

function parseCourseDetail(value: unknown): ICourseDetailContent {
  const defaults = defaultCourseDetail();
  if (!value || typeof value !== "object") {
    return defaults;
  }

  const obj = value as Record<string, unknown>;
  return {
    benefits: parseBenefits(obj.benefits),
    modules: parseModules(obj.modules),
    audience: parseStringArray(obj.audience),
    faqs: parseCourseFaqs(obj.faqs),
    startingPriceBdt:
      typeof obj.startingPriceBdt === "number" && obj.startingPriceBdt >= 0
        ? obj.startingPriceBdt
        : defaults.startingPriceBdt,
    recommendedPackage:
      typeof obj.recommendedPackage === "string" && obj.recommendedPackage.trim()
        ? obj.recommendedPackage.trim()
        : defaults.recommendedPackage,
  };
}

export const adminGetCourses = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const docs = await CourseCatalog.find().sort({ sortOrder: 1, createdAt: -1 });
    res.status(200).json({
      success: true,
      message: "Courses fetched successfully",
      data: docs.map((doc) => formatCourseCatalog(doc)),
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch courses",
      data: null,
    });
  }
};

export const adminGetCourseById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid course id",
        data: null,
      });
      return;
    }

    const doc = await CourseCatalog.findById(id);
    if (!doc) {
      res.status(404).json({
        success: false,
        message: "Course not found",
        data: null,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Course fetched successfully",
      data: formatCourseCatalog(doc),
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch course",
      data: null,
    });
  }
};

export const adminCreateCourse = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const body = req.body as Record<string, unknown>;
    const { slug, title, description, category, gender, icon, target, sortOrder, showOnWebsite, detail } =
      body;

    if (typeof title !== "string" || !title.trim()) {
      res.status(400).json({
        success: false,
        message: "Course title is required",
        data: null,
      });
      return;
    }

    if (typeof description !== "string" || !description.trim()) {
      res.status(400).json({
        success: false,
        message: "Course description is required",
        data: null,
      });
      return;
    }

    if (typeof category !== "string" || !isValidCategory(category)) {
      res.status(400).json({
        success: false,
        message: "Valid category is required (private, record, live, or free)",
        data: null,
      });
      return;
    }

    if (gender !== undefined && gender !== null && gender !== "") {
      if (typeof gender !== "string" || !isValidGender(gender)) {
        res.status(400).json({
          success: false,
          message: "Gender must be male, female, or children when provided",
          data: null,
        });
        return;
      }
    }

    const resolvedSlug =
      typeof slug === "string" && slug.trim()
        ? slug.trim().toLowerCase()
        : buildSlug(title);

    const doc = await CourseCatalog.create({
      slug: resolvedSlug,
      title: title.trim(),
      description: description.trim(),
      category,
      gender:
        typeof gender === "string" && isValidGender(gender) ? gender : undefined,
      icon: typeof icon === "string" && icon.trim() ? icon.trim() : "📖",
      target: typeof target === "string" && target.trim() ? target.trim() : undefined,
      sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
      showOnWebsite: showOnWebsite !== false,
      detail: parseCourseDetail(detail),
    });

    res.status(201).json({
      success: true,
      message: "Course created successfully",
      data: formatCourseCatalog(doc),
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message.includes("duplicate")
        ? "A course with this slug already exists"
        : "Failed to create course";
    res.status(500).json({ success: false, message, data: null });
  }
};

export const adminUpdateCourse = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid course id",
        data: null,
      });
      return;
    }

    const doc = await CourseCatalog.findById(id);
    if (!doc) {
      res.status(404).json({
        success: false,
        message: "Course not found",
        data: null,
      });
      return;
    }

    const body = req.body as Record<string, unknown>;

    if (typeof body.slug === "string" && body.slug.trim()) {
      doc.slug = body.slug.trim().toLowerCase();
    }
    if (typeof body.title === "string" && body.title.trim()) {
      doc.title = body.title.trim();
    }
    if (typeof body.description === "string" && body.description.trim()) {
      doc.description = body.description.trim();
    }
    if (typeof body.category === "string") {
      if (!isValidCategory(body.category)) {
        res.status(400).json({
          success: false,
          message: "Valid category is required (private, record, live, or free)",
          data: null,
        });
        return;
      }
      doc.category = body.category;
    }
    if (body.gender !== undefined) {
      if (body.gender === null || body.gender === "") {
        doc.gender = undefined;
      } else if (typeof body.gender === "string" && isValidGender(body.gender)) {
        doc.gender = body.gender;
      } else {
        res.status(400).json({
          success: false,
          message: "Gender must be male, female, or children when provided",
          data: null,
        });
        return;
      }
    }
    if (typeof body.icon === "string" && body.icon.trim()) {
      doc.icon = body.icon.trim();
    }
    if (body.target !== undefined) {
      doc.target =
        typeof body.target === "string" && body.target.trim()
          ? body.target.trim()
          : undefined;
    }
    if (typeof body.sortOrder === "number") {
      doc.sortOrder = body.sortOrder;
    }
    if (typeof body.showOnWebsite === "boolean") {
      doc.showOnWebsite = body.showOnWebsite;
    }
    if (body.detail !== undefined) {
      doc.detail = parseCourseDetail(body.detail);
    }

    await doc.save();

    res.status(200).json({
      success: true,
      message: "Course updated successfully",
      data: formatCourseCatalog(doc),
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message.includes("duplicate")
        ? "A course with this slug already exists"
        : "Failed to update course";
    res.status(500).json({ success: false, message, data: null });
  }
};

export const adminDeleteCourse = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid course id",
        data: null,
      });
      return;
    }

    const doc = await CourseCatalog.findByIdAndDelete(id);
    if (!doc) {
      res.status(404).json({
        success: false,
        message: "Course not found",
        data: null,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Course deleted successfully",
      data: null,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to delete course",
      data: null,
    });
  }
};
