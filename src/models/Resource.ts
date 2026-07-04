import mongoose, { Document, Schema, Types } from "mongoose";

export const RESOURCE_TYPES = ["ebook", "audio", "video"] as const;
export type ResourceType = (typeof RESOURCE_TYPES)[number];

export const RESOURCE_STATUS = ["draft", "published"] as const;
export type ResourceStatus = (typeof RESOURCE_STATUS)[number];

export const EBOOK_CATEGORIES = [
  "tajweed",
  "islamic-history",
  "religious",
] as const;
export type EbookCategory = (typeof EBOOK_CATEGORIES)[number];

export const EBOOK_LANGUAGES = ["en", "bn", "both"] as const;
export type EbookLanguage = (typeof EBOOK_LANGUAGES)[number];

/** Sub-section within a resource type (audio/video pages). */
export const RESOURCE_SECTIONS = [
  "default",
  "featured",
  "verses",
  "recitation",
  "gallery",
  "playlist",
] as const;
export type ResourceSection = (typeof RESOURCE_SECTIONS)[number];

export interface IAudioVerseEntry {
  arabic: string;
  translation: string;
}

export interface IResourceTranslation {
  title?: string;
  description?: string;
}

export interface IResource extends Document {
  type: ResourceType;
  section: ResourceSection;
  title: string;
  slug: string;
  description?: string;
  status: ResourceStatus;
  featured: boolean;
  sortOrder: number;
  /** Ebook */
  category?: EbookCategory;
  coverGradient?: string;
  coverUrl?: string;
  coverPublicId?: string;
  pdfUrl?: string;
  pdfPublicId?: string;
  fileSize?: string;
  pageCount?: number;
  language?: EbookLanguage;
  author?: string;
  /** Audio */
  audioUrl?: string;
  audioPublicId?: string;
  duration?: string;
  paraInfo?: string;
  surahName?: string;
  progress?: number;
  verses?: IAudioVerseEntry[];
  /** Video */
  youtubeId?: string;
  startSeconds?: number;
  translations?: {
    bn?: IResourceTranslation;
  };
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const audioVerseSchema = new Schema<IAudioVerseEntry>(
  {
    arabic: { type: String, required: true, trim: true },
    translation: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const resourceTranslationSchema = new Schema(
  {
    title: { type: String, trim: true },
    description: { type: String, trim: true },
  },
  { _id: false }
);

const resourceSchema = new Schema<IResource>(
  {
    type: { type: String, required: true, enum: RESOURCE_TYPES },
    section: {
      type: String,
      enum: RESOURCE_SECTIONS,
      default: "default",
    },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    description: { type: String, trim: true },
    status: {
      type: String,
      enum: RESOURCE_STATUS,
      default: "draft",
    },
    featured: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
    category: { type: String, enum: EBOOK_CATEGORIES },
    coverGradient: { type: String, trim: true },
    coverUrl: { type: String, trim: true },
    coverPublicId: { type: String, trim: true },
    pdfUrl: { type: String, trim: true },
    pdfPublicId: { type: String, trim: true },
    fileSize: { type: String, trim: true },
    pageCount: { type: Number, min: 0 },
    language: { type: String, enum: EBOOK_LANGUAGES },
    author: { type: String, trim: true },
    audioUrl: { type: String, trim: true },
    audioPublicId: { type: String, trim: true },
    duration: { type: String, trim: true },
    paraInfo: { type: String, trim: true },
    surahName: { type: String, trim: true },
    progress: { type: Number, min: 0, max: 100 },
    verses: [audioVerseSchema],
    youtubeId: { type: String, trim: true },
    startSeconds: { type: Number, min: 0 },
    translations: {
      bn: { type: resourceTranslationSchema, default: undefined },
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    publishedAt: { type: Date },
  },
  { timestamps: true }
);

resourceSchema.index({ type: 1, status: 1, sortOrder: 1 });
resourceSchema.index({ type: 1, slug: 1 }, { unique: true });
resourceSchema.index({ type: 1, section: 1, status: 1 });

export const Resource = mongoose.model<IResource>("Resource", resourceSchema);
