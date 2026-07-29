import mongoose, { Document, Schema } from "mongoose";

export interface IHomeHeroLocaleContent {
  badge: string;
  title: string;
  titleHighlight?: string;
  subtitle: string;
  imageAlt: string;
  primaryCta: string;
  secondaryCta: string;
}

export interface IHomeHeroSlide extends Document {
  slideId: string;
  sortOrder: number;
  imageUrl: string;
  imagePublicId?: string;
  imageObjectPosition: string;
  imageScale: number;
  primaryHref: string;
  secondaryHref: string;
  theme: "light" | "dark";
  showOnWebsite: boolean;
  contentEn: IHomeHeroLocaleContent;
  contentBn: IHomeHeroLocaleContent;
  createdAt: Date;
  updatedAt: Date;
}

const localeContentSchema = new Schema<IHomeHeroLocaleContent>(
  {
    badge: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    titleHighlight: { type: String, trim: true },
    subtitle: { type: String, required: true, trim: true },
    imageAlt: { type: String, required: true, trim: true },
    primaryCta: { type: String, required: true, trim: true },
    secondaryCta: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const homeHeroSlideSchema = new Schema<IHomeHeroSlide>(
  {
    slideId: { type: String, required: true, unique: true, trim: true },
    sortOrder: { type: Number, default: 0 },
    imageUrl: { type: String, required: true, trim: true },
    imagePublicId: { type: String, trim: true },
    imageObjectPosition: { type: String, default: "50% 25%", trim: true },
    imageScale: { type: Number, default: 100, min: 85, max: 100 },
    primaryHref: { type: String, required: true, trim: true },
    secondaryHref: { type: String, required: true, trim: true },
    theme: { type: String, enum: ["light", "dark"], default: "light" },
    showOnWebsite: { type: Boolean, default: true },
    contentEn: { type: localeContentSchema, required: true },
    contentBn: { type: localeContentSchema, required: true },
  },
  { timestamps: true }
);

export const HomeHeroSlide = mongoose.model<IHomeHeroSlide>(
  "HomeHeroSlide",
  homeHeroSlideSchema
);
