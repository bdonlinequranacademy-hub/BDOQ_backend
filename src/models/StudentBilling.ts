import mongoose, { Document, Schema, Types } from "mongoose";

export type BillingCurrency = "USD" | "GBP" | "EUR" | "BDT" | "CAD" | "AUD";

export interface IStudentBilling extends Document {
  student: Types.ObjectId;
  monthlyFee: number;
  currency: BillingCurrency;
  dueDayOfMonth: number;
  paidUntil: Date | null;
  lastReminderAt: Date | null;
  lastReminderKind: "due_soon" | "due_today" | "overdue" | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const studentBillingSchema = new Schema<IStudentBilling>(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    monthlyFee: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      enum: ["USD", "GBP", "EUR", "BDT", "CAD", "AUD"],
      default: "USD",
    },
    dueDayOfMonth: {
      type: Number,
      min: 1,
      max: 28,
      default: 1,
    },
    paidUntil: {
      type: Date,
      default: null,
    },
    lastReminderAt: {
      type: Date,
      default: null,
    },
    lastReminderKind: {
      type: String,
      enum: ["due_soon", "due_today", "overdue", null],
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

studentBillingSchema.index({ isActive: 1, paidUntil: 1 });

export const StudentBilling = mongoose.model<IStudentBilling>(
  "StudentBilling",
  studentBillingSchema
);
