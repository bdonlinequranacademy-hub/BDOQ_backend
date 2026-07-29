import mongoose, { Document, Schema } from "mongoose";

export interface ISectionHeaderLocaleContent {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  titleHighlight?: string;
  titleAccent?: string;
  intro?: string;
}

export interface ISiteSectionHeader extends Document {
  sectionKey: string;
  label: string;
  sortOrder: number;
  showOnWebsite: boolean;
  contentEn: ISectionHeaderLocaleContent;
  contentBn: ISectionHeaderLocaleContent;
  createdAt: Date;
  updatedAt: Date;
}

const localeContentSchema = new Schema<ISectionHeaderLocaleContent>(
  {
    eyebrow: { type: String, trim: true },
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, trim: true },
    titleHighlight: { type: String, trim: true },
    titleAccent: { type: String, trim: true },
    intro: { type: String, trim: true },
  },
  { _id: false }
);

const siteSectionHeaderSchema = new Schema<ISiteSectionHeader>(
  {
    sectionKey: { type: String, required: true, unique: true, trim: true },
    label: { type: String, required: true, trim: true },
    sortOrder: { type: Number, default: 0 },
    showOnWebsite: { type: Boolean, default: true },
    contentEn: { type: localeContentSchema, required: true },
    contentBn: { type: localeContentSchema, required: true },
  },
  { timestamps: true }
);

export const SiteSectionHeader = mongoose.model<ISiteSectionHeader>(
  "SiteSectionHeader",
  siteSectionHeaderSchema
);
