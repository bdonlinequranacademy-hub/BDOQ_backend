import mongoose, { Document, Schema } from "mongoose";

export interface IPricingPackage extends Document {
  slug: string;
  name: string;
  priceBdt: number;
  priceUsd: number;
  period: string;
  features: string[];
  popular: boolean;
  sortOrder: number;
  showOnWebsite: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const pricingPackageSchema = new Schema<IPricingPackage>(
  {
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true },
    priceBdt: { type: Number, required: true },
    priceUsd: { type: Number, required: true },
    period: { type: String, default: "Monthly", trim: true },
    features: [{ type: String }],
    popular: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
    showOnWebsite: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const PricingPackage = mongoose.model<IPricingPackage>(
  "PricingPackage",
  pricingPackageSchema
);
