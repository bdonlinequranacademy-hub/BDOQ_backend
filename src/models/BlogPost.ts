import mongoose, { Document, Schema, Types } from "mongoose";

export const BLOG_CATEGORIES = [
  "Quran & Tajweed",
  "Parent Guides",
  "Learning Tips",
  "Platform & AI",
] as const;

/** Categories shown on the public marketing blog (education only). */
export const PUBLIC_BLOG_CATEGORIES = [
  "Quran & Tajweed",
  "Parent Guides",
  "Learning Tips",
] as const;

export type PublicBlogCategory = (typeof PUBLIC_BLOG_CATEGORIES)[number];

/** Tags that block a post from the public education blog entirely. */
export const EXCLUDED_PUBLIC_BLOG_TAGS = [
  "payment",
  "bkash",
  "nagad",
  "billing",
  "invoice",
  "fees",
  "paypal",
  "wise",
  "portal",
] as const;

/** Non-educational tags hidden from blog filters and cards (post still shows). */
export const HIDDEN_PUBLIC_BLOG_TAGS = [
  "bangladesh",
  "checklist",
] as const;

export function filterPublicBlogTags(tags: string[] = []): string[] {
  const hidden = new Set([
    ...EXCLUDED_PUBLIC_BLOG_TAGS,
    ...HIDDEN_PUBLIC_BLOG_TAGS,
  ].map((tag) => tag.toLowerCase()));
  return tags.filter((tag) => !hidden.has(tag.toLowerCase()));
}

export function isPublicBlogPost(post: {
  category: string;
  tags?: string[];
  slug?: string;
}): boolean {
  if (
    !PUBLIC_BLOG_CATEGORIES.includes(post.category as PublicBlogCategory)
  ) {
    return false;
  }

  const tags = (post.tags ?? []).map((tag) => tag.toLowerCase());
  if (
    EXCLUDED_PUBLIC_BLOG_TAGS.some((blocked) => tags.includes(blocked))
  ) {
    return false;
  }

  const slug = post.slug?.toLowerCase() ?? "";
  if (slug.includes("payment") || slug.includes("bkash")) {
    return false;
  }

  return true;
}

export type BlogCategory = (typeof BLOG_CATEGORIES)[number];
export type BlogPostStatus = "draft" | "published";

export interface IBlogAuthor {
  name: string;
  role?: string;
}

export interface IBlogFaq {
  question: string;
  answer: string;
}

export interface IBlogTranslation {
  title?: string;
  description?: string;
  body?: string;
  tags?: string[];
}

export interface IBlogPost extends Document {
  title: string;
  slug: string;
  description: string;
  body: string;
  pubDate: Date;
  category: BlogCategory;
  tags: string[];
  author: IBlogAuthor;
  readMinutes?: number;
  featured: boolean;
  status: BlogPostStatus;
  faqs: IBlogFaq[];
  translations?: {
    bn?: IBlogTranslation;
  };
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const blogAuthorSchema = new Schema<IBlogAuthor>(
  {
    name: { type: String, required: true, trim: true },
    role: { type: String, trim: true },
  },
  { _id: false }
);

const blogFaqSchema = new Schema<IBlogFaq>(
  {
    question: { type: String, required: true, trim: true },
    answer: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const blogTranslationSchema = new Schema(
  {
    title: { type: String, trim: true },
    description: { type: String, trim: true },
    body: { type: String },
    tags: [{ type: String, trim: true }],
  },
  { _id: false }
);

const blogPostSchema = new Schema<IBlogPost>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    pubDate: { type: Date, required: true, default: () => new Date() },
    category: {
      type: String,
      required: true,
      enum: BLOG_CATEGORIES,
    },
    tags: [{ type: String, trim: true }],
    author: { type: blogAuthorSchema, required: true },
    readMinutes: { type: Number, min: 1 },
    featured: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
    },
    faqs: [blogFaqSchema],
    translations: {
      bn: { type: blogTranslationSchema, default: undefined },
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

blogPostSchema.index({ status: 1, pubDate: -1 });
blogPostSchema.index({ category: 1, status: 1 });

export const BlogPost = mongoose.model<IBlogPost>("BlogPost", blogPostSchema);
