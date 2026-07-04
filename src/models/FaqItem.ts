import mongoose, { Document, Schema } from "mongoose";

export interface IFaqItem extends Document {
  externalId: string;
  question: string;
  answer: string;
  sortOrder: number;
  showOnWebsite: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const faqItemSchema = new Schema<IFaqItem>(
  {
    externalId: { type: String, required: true, unique: true, trim: true },
    question: { type: String, required: true, trim: true },
    answer: { type: String, required: true, trim: true },
    sortOrder: { type: Number, default: 0 },
    showOnWebsite: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const FaqItem = mongoose.model<IFaqItem>("FaqItem", faqItemSchema);
