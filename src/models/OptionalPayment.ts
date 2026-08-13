import mongoose, { Document, Schema, Types } from "mongoose";

export const OPTIONAL_PAYMENT_CATEGORIES = [
  "teacher_bakhshish",
  "eid_gift",
  "sponsor_student",
  "sadaqah",
  "custom",
] as const;

export type OptionalPaymentCategory = (typeof OPTIONAL_PAYMENT_CATEGORIES)[number];

export const OPTIONAL_PAYMENT_METHODS = [
  "bkash",
  "nagad",
  "rocket",
  "bank",
] as const;

export type OptionalPaymentMethod = (typeof OPTIONAL_PAYMENT_METHODS)[number];

export const OPTIONAL_PAYMENT_STATUSES = [
  "pending",
  "approved",
  "rejected",
] as const;

export type OptionalPaymentStatus = (typeof OPTIONAL_PAYMENT_STATUSES)[number];

export const OPTIONAL_PAYMENT_CURRENCIES = ["BDT", "USD"] as const;
export type OptionalPaymentCurrency = (typeof OPTIONAL_PAYMENT_CURRENCIES)[number];

export interface IOptionalPayment extends Document {
  category: OptionalPaymentCategory;
  customLabel?: string;
  amount: number;
  currency: OptionalPaymentCurrency;
  method: OptionalPaymentMethod;
  payerName: string;
  email?: string;
  whatsapp?: string;
  note?: string;
  reference: string;
  paymentDate: Date;
  screenshotUrl: string;
  screenshotPublicId: string;
  status: OptionalPaymentStatus;
  rejectionReason?: string;
  linkedUserId?: Types.ObjectId;
  source: "public" | "portal";
  locale?: "en" | "bn";
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const optionalPaymentSchema = new Schema<IOptionalPayment>(
  {
    category: {
      type: String,
      enum: OPTIONAL_PAYMENT_CATEGORIES,
      required: true,
      index: true,
    },
    customLabel: { type: String, trim: true, maxlength: 120 },
    amount: { type: Number, required: true, min: 1 },
    currency: {
      type: String,
      enum: OPTIONAL_PAYMENT_CURRENCIES,
      default: "BDT",
    },
    method: {
      type: String,
      enum: OPTIONAL_PAYMENT_METHODS,
      required: true,
    },
    payerName: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, trim: true, lowercase: true, maxlength: 160 },
    whatsapp: { type: String, trim: true, maxlength: 40 },
    note: { type: String, trim: true, maxlength: 2000 },
    reference: { type: String, required: true, trim: true, maxlength: 120 },
    paymentDate: { type: Date, required: true },
    screenshotUrl: { type: String, required: true, trim: true },
    screenshotPublicId: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: OPTIONAL_PAYMENT_STATUSES,
      default: "pending",
      index: true,
    },
    rejectionReason: { type: String, trim: true, maxlength: 500 },
    linkedUserId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    source: {
      type: String,
      enum: ["public", "portal"],
      default: "public",
    },
    locale: { type: String, enum: ["en", "bn"] },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

optionalPaymentSchema.index({ status: 1, createdAt: -1 });
optionalPaymentSchema.index({ category: 1, createdAt: -1 });
optionalPaymentSchema.index({ email: 1, createdAt: -1 });

export const OptionalPayment = mongoose.model<IOptionalPayment>(
  "OptionalPayment",
  optionalPaymentSchema
);
