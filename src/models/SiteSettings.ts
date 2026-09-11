import mongoose, { Document, Schema } from "mongoose";

export interface ISiteSettings extends Document {
  isTeacherApplicationOpen: boolean;
}

const siteSettingsSchema = new Schema<ISiteSettings>(
  {
    isTeacherApplicationOpen: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export const SiteSettings = mongoose.model<ISiteSettings>(
  "SiteSettings",
  siteSettingsSchema
);
