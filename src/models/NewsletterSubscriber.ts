import mongoose, { Document, Schema } from "mongoose";

export type NewsletterSubscriberStatus = "active" | "unsubscribed";

export interface INewsletterSubscriber extends Document {
  email: string;
  locale?: "en" | "bn";
  source?: string;
  status: NewsletterSubscriberStatus;
  createdAt: Date;
  updatedAt: Date;
}

const newsletterSubscriberSchema = new Schema<INewsletterSubscriber>(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
    locale: { type: String, enum: ["en", "bn"] },
    source: { type: String, trim: true, maxlength: 80, default: "footer" },
    status: {
      type: String,
      enum: ["active", "unsubscribed"],
      default: "active",
    },
  },
  { timestamps: true }
);

newsletterSubscriberSchema.index({ email: 1 }, { unique: true });
newsletterSubscriberSchema.index({ status: 1, createdAt: -1 });

export const NewsletterSubscriber = mongoose.model<INewsletterSubscriber>(
  "NewsletterSubscriber",
  newsletterSubscriberSchema
);
