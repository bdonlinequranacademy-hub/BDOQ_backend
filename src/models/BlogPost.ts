import mongoose, { Document, Schema, Types } from "mongoose";

export const BLOG_CATEGORIES = [
  "Quran & Tajweed",
  "Parent Guides",
  "Learning Tips",
  "Platform & AI",
] as const;

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
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

blogPostSchema.index({ status: 1, pubDate: -1 });
blogPostSchema.index({ category: 1, status: 1 });

export const BlogPost = mongoose.model<IBlogPost>("BlogPost", blogPostSchema);
