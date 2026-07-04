import mongoose, { Document, Schema } from "mongoose";

export type GalleryAlbumType = "gallery-01" | "gallery-02" | "gallery-03";

export const GALLERY_MEDIA_TYPES = ["photo", "video", "audio"] as const;
export type GalleryMediaType = (typeof GALLERY_MEDIA_TYPES)[number];

export interface IGalleryItem extends Document {
  externalId: string;
  title: string;
  description?: string;
  album: GalleryAlbumType;
  mediaType: GalleryMediaType;
  mediaUrl?: string;
  mediaPublicId?: string;
  youtubeId?: string;
  coverGradient: string;
  heightClass: string;
  /** @deprecated use mediaUrl — kept for backward compatibility */
  imageUrl?: string;
  sortOrder: number;
  showOnWebsite: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const galleryItemSchema = new Schema<IGalleryItem>(
  {
    externalId: { type: String, required: true, unique: true, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    album: {
      type: String,
      enum: ["gallery-01", "gallery-02", "gallery-03"],
      required: true,
    },
    mediaType: {
      type: String,
      enum: GALLERY_MEDIA_TYPES,
      default: "photo",
    },
    mediaUrl: { type: String, trim: true },
    mediaPublicId: { type: String, trim: true },
    youtubeId: { type: String, trim: true },
    coverGradient: { type: String, required: true, trim: true },
    heightClass: { type: String, default: "h-56", trim: true },
    imageUrl: { type: String, trim: true },
    sortOrder: { type: Number, default: 0 },
    showOnWebsite: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const GalleryItem = mongoose.model<IGalleryItem>(
  "GalleryItem",
  galleryItemSchema
);
