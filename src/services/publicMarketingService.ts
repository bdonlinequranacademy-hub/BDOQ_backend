import {
  CourseCatalog,
  type ICourseCatalog,
  type ICourseDetailContent,
} from "../models/CourseCatalog";
import { FaqItem } from "../models/FaqItem";
import { GalleryItem } from "../models/GalleryItem";
import { PricingPackage } from "../models/PricingPackage";
import { SessionSlot } from "../models/SessionSlot";
import { Testimonial } from "../models/Testimonial";

export interface PublicCourseView {
  slug: string;
  title: string;
  description: string;
  icon: string;
  target?: string;
  category: string;
  gender?: string;
  detail: ICourseDetailContent;
}

export interface PublicPackageView {
  slug: string;
  name: string;
  price: { bdt: number; usd: number };
  period: string;
  features: string[];
  popular?: boolean;
}

export interface PublicTestimonialView {
  id: string;
  name: string;
  role: string;
  location: string;
  content: string;
  rating: number;
  image?: string;
  mediaType: "text" | "audio" | "video";
  mediaUrl?: string;
  youtubeId?: string;
}

export interface PublicFaqView {
  id: string;
  question: string;
  answer: string;
}

export interface PublicGalleryItemView {
  id: string;
  title: string;
  description?: string;
  album: string;
  mediaType: "photo" | "video" | "audio";
  mediaUrl?: string;
  youtubeId?: string;
  coverGradient: string;
  heightClass: string;
  imageUrl?: string;
}

export interface PublicScheduleDayView {
  day: string;
  hasSessions: boolean;
  sessionCount: number;
}

const WEEKDAY_SHORT = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
] as const;

const DAY_TO_SHORT: Record<string, string> = {
  Monday: "Mon",
  Tuesday: "Tue",
  Wednesday: "Wed",
  Thursday: "Thu",
  Friday: "Fri",
  Saturday: "Sat",
  Sunday: "Sun",
};

function mapCourse(doc: ICourseCatalog): PublicCourseView {
  return {
    slug: doc.slug,
    title: doc.title,
    description: doc.description,
    icon: doc.icon,
    target: doc.target || undefined,
    category: doc.category,
    gender: doc.gender || undefined,
    detail: doc.detail,
  };
}

export async function listPublicCourses(filters?: {
  category?: string;
  gender?: string;
}): Promise<PublicCourseView[]> {
  const query: Record<string, unknown> = { showOnWebsite: true };
  if (filters?.category) query.category = filters.category;
  if (filters?.gender) query.gender = filters.gender;

  const docs = await CourseCatalog.find(query)
    .sort({ sortOrder: 1, title: 1 })
    .lean<ICourseCatalog[]>();

  return docs.map((doc) => mapCourse(doc as ICourseCatalog));
}

export async function getPublicCourseBySlug(
  slug: string
): Promise<PublicCourseView | null> {
  const doc = await CourseCatalog.findOne({
    slug: slug.toLowerCase(),
    showOnWebsite: true,
  }).lean<ICourseCatalog>();

  if (!doc) return null;
  return mapCourse(doc as ICourseCatalog);
}

export async function listPublicPricing(): Promise<PublicPackageView[]> {
  const docs = await PricingPackage.find({ showOnWebsite: true })
    .sort({ sortOrder: 1 })
    .lean();

  return docs.map((doc) => ({
    slug: doc.slug,
    name: doc.name,
    price: { bdt: doc.priceBdt, usd: doc.priceUsd },
    period: doc.period,
    features: doc.features,
    popular: doc.popular || undefined,
  }));
}

export async function listPublicTestimonials(): Promise<PublicTestimonialView[]> {
  const docs = await Testimonial.find({ showOnWebsite: true })
    .sort({ sortOrder: 1 })
    .lean();

  return docs.map((doc) => ({
    id: doc.externalId,
    name: doc.name,
    role: doc.role,
    location: doc.location,
    content: doc.content,
    rating: doc.rating,
    image: doc.image || undefined,
    mediaType: doc.mediaType ?? "text",
    mediaUrl: doc.mediaUrl || undefined,
    youtubeId: doc.youtubeId || undefined,
  }));
}

export async function listPublicFaq(): Promise<PublicFaqView[]> {
  const docs = await FaqItem.find({ showOnWebsite: true })
    .sort({ sortOrder: 1 })
    .lean();

  return docs.map((doc) => ({
    id: doc.externalId,
    question: doc.question,
    answer: doc.answer,
  }));
}

export async function listPublicGallery(): Promise<PublicGalleryItemView[]> {
  const docs = await GalleryItem.find({ showOnWebsite: true })
    .sort({ sortOrder: 1 })
    .lean();

  return docs.map((doc) => ({
    id: doc.externalId,
    title: doc.title,
    description: doc.description || undefined,
    album: doc.album,
    mediaType: doc.mediaType ?? "photo",
    mediaUrl: doc.mediaUrl?.trim() || doc.imageUrl?.trim() || undefined,
    youtubeId: doc.youtubeId?.trim() || undefined,
    coverGradient: doc.coverGradient,
    heightClass: doc.heightClass,
    imageUrl: doc.mediaUrl?.trim() || doc.imageUrl?.trim() || undefined,
  }));
}

export async function getPublicWeeklySchedulePreview(): Promise<{
  days: PublicScheduleDayView[];
  hasData: boolean;
}> {
  const grouped = await SessionSlot.aggregate<{ _id: string; count: number }>([
    { $match: { isActive: true } },
    { $group: { _id: "$day", count: { $sum: 1 } } },
  ]);

  const countByShort = new Map<string, number>();
  for (const row of grouped) {
    const short = DAY_TO_SHORT[row._id];
    if (short) countByShort.set(short, row.count);
  }

  const days = WEEKDAY_SHORT.map((day) => ({
    day,
    hasSessions: (countByShort.get(day) ?? 0) > 0,
    sessionCount: countByShort.get(day) ?? 0,
  }));

  return {
    days,
    hasData: days.some((day) => day.hasSessions),
  };
}
