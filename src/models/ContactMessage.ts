import mongoose, { Document, Schema } from "mongoose";

export type ContactMessageStatus = "new" | "replied" | "closed";

export interface IContactMessage extends Document {
  name: string;
  email: string;
  subject?: string;
  message: string;
  locale?: "en" | "bn";
  status: ContactMessageStatus;
  createdAt: Date;
  updatedAt: Date;
}

const contactMessageSchema = new Schema<IContactMessage>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true },
    subject: { type: String, trim: true, maxlength: 200 },
    message: { type: String, required: true, trim: true, maxlength: 5000 },
    locale: { type: String, enum: ["en", "bn"] },
    status: {
      type: String,
      enum: ["new", "replied", "closed"],
      default: "new",
    },
  },
  { timestamps: true }
);

contactMessageSchema.index({ status: 1, createdAt: -1 });
contactMessageSchema.index({ email: 1, createdAt: -1 });

export const ContactMessage = mongoose.model<IContactMessage>(
  "ContactMessage",
  contactMessageSchema
);
