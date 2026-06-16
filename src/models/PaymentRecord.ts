import mongoose, { Document, Schema, Types } from "mongoose";
import type { BillingCurrency } from "./StudentBilling";

export type PaymentMethod =
  | "zelle"
  | "wise"
  | "bank_transfer"
  | "paypal"
  | "cash_app"
  | "other";

export type PaymentStatus = "pending" | "approved" | "rejected";

export interface IPaymentRecord extends Document {
  student: Types.ObjectId;
  amount: number;
  currency: BillingCurrency;
  country: string;
  paymentDate: Date;
  monthsCovered: number;
  method: PaymentMethod;
  reference: string;
  transactionFee?: number;
  netAmount?: number;
  note?: string;
  screenshotUrl: string;
  screenshotPublicId: string;
  status: PaymentStatus;
  rejectionReason?: string;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  paidUntilAfter?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const paymentRecordSchema = new Schema<IPaymentRecord>(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      enum: ["USD", "GBP", "EUR", "BDT", "CAD", "AUD"],
      required: true,
    },
    country: {
      type: String,
      required: true,
      trim: true,
    },
    paymentDate: {
      type: Date,
      required: true,
    },
    monthsCovered: {
      type: Number,
      required: true,
      min: 1,
      max: 24,
    },
    method: {
      type: String,
      enum: ["zelle", "wise", "bank_transfer", "paypal", "cash_app", "other"],
      required: true,
    },
    reference: {
      type: String,
      required: true,
      trim: true,
    },
    transactionFee: {
      type: Number,
      min: 0,
    },
    netAmount: {
      type: Number,
      min: 0,
    },
    note: {
      type: String,
      trim: true,
    },
    screenshotUrl: {
      type: String,
      required: true,
    },
    screenshotPublicId: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    reviewedAt: {
      type: Date,
    },
    paidUntilAfter: {
      type: Date,
    },
  },
  { timestamps: true }
);

paymentRecordSchema.index({ student: 1, createdAt: -1 });
paymentRecordSchema.index({ status: 1, createdAt: -1 });

export const PaymentRecord = mongoose.model<IPaymentRecord>(
  "PaymentRecord",
  paymentRecordSchema
);
