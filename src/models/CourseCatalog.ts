import mongoose, { Document, Schema } from "mongoose";

export type CourseCategoryType = "private" | "record" | "live" | "free";
export type CourseGenderType = "male" | "female" | "children";

export interface ICourseBenefit {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export interface ICourseModule {
  id: string;
  title: string;
  topics: string[];
}

export interface ICourseFaq {
  id: string;
  question: string;
  answer: string;
}

export interface ICourseDetailContent {
  benefits: ICourseBenefit[];
  modules: ICourseModule[];
  audience: string[];
  faqs: ICourseFaq[];
  startingPriceBdt: number;
  recommendedPackage: string;
}

export interface ICourseCatalog extends Document {
  slug: string;
  title: string;
  description: string;
  icon: string;
  target?: string;
  category: CourseCategoryType;
  gender?: CourseGenderType;
  sortOrder: number;
  showOnWebsite: boolean;
  detail: ICourseDetailContent;
  createdAt: Date;
  updatedAt: Date;
}

const courseDetailSchema = new Schema<ICourseDetailContent>(
  {
    benefits: [
      {
        id: { type: String, required: true },
        title: { type: String, required: true },
        description: { type: String, required: true },
        icon: { type: String, required: true },
      },
    ],
    modules: [
      {
        id: { type: String, required: true },
        title: { type: String, required: true },
        topics: [{ type: String }],
      },
    ],
    audience: [{ type: String }],
    faqs: [
      {
        id: { type: String, required: true },
        question: { type: String, required: true },
        answer: { type: String, required: true },
      },
    ],
    startingPriceBdt: { type: Number, required: true },
    recommendedPackage: { type: String, required: true },
  },
  { _id: false }
);

const courseCatalogSchema = new Schema<ICourseCatalog>(
  {
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    icon: { type: String, default: "📖" },
    target: { type: String, trim: true },
    category: {
      type: String,
      enum: ["private", "record", "live", "free"],
      required: true,
    },
    gender: {
      type: String,
      enum: ["male", "female", "children"],
    },
    sortOrder: { type: Number, default: 0 },
    showOnWebsite: { type: Boolean, default: true },
    detail: { type: courseDetailSchema, required: true },
  },
  { timestamps: true }
);

courseCatalogSchema.index({ showOnWebsite: 1, category: 1, sortOrder: 1 });

export const CourseCatalog = mongoose.model<ICourseCatalog>(
  "CourseCatalog",
  courseCatalogSchema
);
