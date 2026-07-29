import { Request, Response } from "express";
import {
  getPublicProgressHighlights,
  getPublicStats,
  getPublicTeacherBySlug,
  listPublicTeachers,
} from "../services/publicContentService";
import {
  getPublicCourseBySlug,
  getPublicWeeklySchedulePreview,
  listPublicCourses,
  listPublicFaq,
  listPublicGallery,
  listPublicPricing,
  listPublicTestimonials,
} from "../services/publicMarketingService";
import { listPublicHomeHeroSlides } from "../services/homeHeroService";
import { listPublicSectionHeaders } from "../services/sectionHeaderService";

export const getPublicTeachersHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const genderParam = req.query.gender;
    const featuredParam = req.query.featured;

    const gender =
      genderParam === "male" || genderParam === "female"
        ? genderParam
        : undefined;
    const featured =
      featuredParam === "true" || featuredParam === "1" ? true : undefined;

    const teachers = await listPublicTeachers({ gender, featured });

    res.status(200).json({
      success: true,
      message: "Teachers fetched successfully",
      data: { teachers },
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch teachers",
      data: null,
    });
  }
};

export const getPublicTeacherBySlugHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { slug } = req.params;
    const teacher = await getPublicTeacherBySlug(slug);

    if (!teacher) {
      res.status(404).json({
        success: false,
        message: "Teacher not found",
        data: null,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Teacher fetched successfully",
      data: teacher,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch teacher",
      data: null,
    });
  }
};

export const getPublicStatsHandler = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const stats = await getPublicStats();

    res.status(200).json({
      success: true,
      message: "Public stats fetched successfully",
      data: stats,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch public stats",
      data: null,
    });
  }
};

export const getPublicProgressHighlightsHandler = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const highlights = await getPublicProgressHighlights();

    res.status(200).json({
      success: true,
      message: "Progress highlights fetched successfully",
      data: highlights,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch progress highlights",
      data: null,
    });
  }
};

export const getPublicCoursesHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const category =
      typeof req.query.category === "string" ? req.query.category : undefined;
    const gender =
      typeof req.query.gender === "string" ? req.query.gender : undefined;

    const courses = await listPublicCourses({ category, gender });

    res.status(200).json({
      success: true,
      message: "Courses fetched successfully",
      data: { courses },
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch courses",
      data: null,
    });
  }
};

export const getPublicCourseBySlugHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const course = await getPublicCourseBySlug(req.params.slug);
    if (!course) {
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
      data: course,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch course",
      data: null,
    });
  }
};

export const getPublicPricingHandler = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const packages = await listPublicPricing();
    res.status(200).json({
      success: true,
      message: "Pricing fetched successfully",
      data: { packages },
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch pricing",
      data: null,
    });
  }
};

export const getPublicTestimonialsHandler = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const testimonials = await listPublicTestimonials();
    res.status(200).json({
      success: true,
      message: "Testimonials fetched successfully",
      data: { testimonials },
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch testimonials",
      data: null,
    });
  }
};

export const getPublicFaqHandler = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const items = await listPublicFaq();
    res.status(200).json({
      success: true,
      message: "FAQ fetched successfully",
      data: { items },
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch FAQ",
      data: null,
    });
  }
};

export const getPublicGalleryHandler = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const items = await listPublicGallery();
    res.status(200).json({
      success: true,
      message: "Gallery fetched successfully",
      data: { items },
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch gallery",
      data: null,
    });
  }
};

export const getPublicHomeHeroHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const localeParam = req.query.locale;
    const locale = localeParam === "bn" ? "bn" : "en";
    const slides = await listPublicHomeHeroSlides(locale);

    res.status(200).json({
      success: true,
      message: "Home hero fetched successfully",
      data: { slides },
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch home hero",
      data: null,
    });
  }
};

export const getPublicSectionHeadersHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const localeParam = req.query.locale;
    const locale = localeParam === "bn" ? "bn" : "en";
    const keysParam = req.query.keys;
    const keys =
      typeof keysParam === "string" && keysParam.trim()
        ? keysParam.split(",").map((key) => key.trim())
        : undefined;

    const headers = await listPublicSectionHeaders(locale, keys);

    res.status(200).json({
      success: true,
      message: "Section headers fetched successfully",
      data: { headers },
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch section headers",
      data: null,
    });
  }
};

export const getPublicSchedulePreviewHandler = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const schedule = await getPublicWeeklySchedulePreview();
    res.status(200).json({
      success: true,
      message: "Schedule preview fetched successfully",
      data: schedule,
    });
  } catch {
    res.status(500).json({
      success: false,
      message: "Failed to fetch schedule preview",
      data: null,
    });
  }
};
