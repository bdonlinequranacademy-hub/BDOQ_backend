import mongoose, { Document, Schema } from "mongoose";

export const TESTIMONIAL_MEDIA_TYPES = ["text", "audio", "video"] as const;
export type TestimonialMediaType = (typeof TESTIMONIAL_MEDIA_TYPES)[number];

export interface ITestimonial extends Document {
  externalId: string;
  name: string;
  role: string;
  location: string;
  content: string;
  rating: number;
  image?: string;
  mediaType: TestimonialMediaType;
  mediaUrl?: string;
  youtubeId?: string;
  sortOrder: number;
  showOnWebsite: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const testimonialSchema = new Schema<ITestimonial>(
  {
    externalId: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    content: { type: String, required: true, trim: true },
    rating: { type: Number, default: 5, min: 1, max: 5 },
    image: { type: String, trim: true },
    mediaType: {
      type: String,
      enum: TESTIMONIAL_MEDIA_TYPES,
      default: "text",
    },
    mediaUrl: { type: String, trim: true },
    youtubeId: { type: String, trim: true },
    sortOrder: { type: Number, default: 0 },
    showOnWebsite: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Testimonial = mongoose.model<ITestimonial>(
  "Testimonial",
  testimonialSchema
);
