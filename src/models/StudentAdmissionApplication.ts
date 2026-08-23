import mongoose, { Document, Schema } from "mongoose";
import type { TrialMeetingPlatform } from "../lib/trialMeetingPlatform";

export type StudentAdmissionStatus =
  | "pending"
  | "reviewing"
  | "approved"
  | "rejected";

export type StudentAdmissionPaymentStatus = "pending" | "verified" | "rejected";

export type StudentAdmissionClassDay =
  | "Saturday"
  | "Sunday"
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday";

export interface IStudentAdmissionApplication extends Document {
  fullName: string;
  email: string;
  whatsapp: string;
  formData: Record<string, unknown>;
  locale?: "en" | "bn";
  status: StudentAdmissionStatus;
  adminNote?: string;
  sourceTrialBookingId?: mongoose.Types.ObjectId;
  prefillToken?: string;
  convertedFromTrial?: boolean;
  paymentStatus: StudentAdmissionPaymentStatus;
  paymentVerifiedAt?: Date;
  paymentRejectedAt?: Date;
  paymentRejectReason?: string;
  classStartDate?: string;
  classDays?: StudentAdmissionClassDay[];
  classesPerWeek?: number;
  classDurationMinutes?: number;
  classTime?: string;
  assignedTeacherSlug?: string;
  assignedTeacherName?: string;
  meetingPlatform?: TrialMeetingPlatform;
  meetingLink?: string;
  monthlyFeeAmount?: number;
  monthlyFeeCurrency?: "bdt" | "usd";
  enrollmentSetupAt?: Date;
  linkedUserId?: mongoose.Types.ObjectId;
  passwordHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

const studentAdmissionApplicationSchema = new Schema<IStudentAdmissionApplication>(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true },
    whatsapp: { type: String, required: true, trim: true },
    formData: { type: Schema.Types.Mixed, required: true },
    locale: { type: String, enum: ["en", "bn"] },
    status: {
      type: String,
      enum: ["pending", "reviewing", "approved", "rejected"],
      default: "pending",
    },
    adminNote: { type: String, trim: true, maxlength: 2000 },
    sourceTrialBookingId: { type: Schema.Types.ObjectId, ref: "TrialBooking" },
    prefillToken: { type: String, trim: true, unique: true, sparse: true },
    convertedFromTrial: { type: Boolean, default: false },
    paymentStatus: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
    },
    paymentVerifiedAt: { type: Date },
    paymentRejectedAt: { type: Date },
    paymentRejectReason: { type: String, trim: true, maxlength: 500 },
    classStartDate: { type: String, trim: true },
    classDays: [
      {
        type: String,
        enum: [
          "Saturday",
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
        ],
      },
    ],
    classesPerWeek: { type: Number, min: 1, max: 7 },
    classDurationMinutes: { type: Number, min: 15, max: 180 },
    classTime: { type: String, trim: true },
    assignedTeacherSlug: { type: String, trim: true },
    assignedTeacherName: { type: String, trim: true },
    meetingPlatform: {
      type: String,
      enum: ["google_meet", "zoom", "teams", "whatsapp", "custom"],
    },
    meetingLink: { type: String, trim: true },
    monthlyFeeAmount: { type: Number, min: 0 },
    monthlyFeeCurrency: { type: String, enum: ["bdt", "usd"] },
    enrollmentSetupAt: { type: Date },
    linkedUserId: { type: Schema.Types.ObjectId, ref: "User" },
    passwordHash: { type: String, select: false },
  },
  { timestamps: true }
);

studentAdmissionApplicationSchema.index({ status: 1, createdAt: -1 });
studentAdmissionApplicationSchema.index({ email: 1, createdAt: -1 });

export const StudentAdmissionApplication = mongoose.model<IStudentAdmissionApplication>(
  "StudentAdmissionApplication",
  studentAdmissionApplicationSchema
);
