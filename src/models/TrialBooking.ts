import mongoose, { Document, Schema } from "mongoose";

export type TrialBookingStatus = "new" | "contacted" | "scheduled" | "closed";

export interface ITrialBooking extends Document {
  parentName: string;
  email: string;
  whatsapp: string;
  learnerType: "child" | "teen" | "adult";
  timeSlot?: "morning" | "afternoon" | "evening";
  teacherPreference: "any" | "female" | "male";
  preferredDays: string[];
  timezone?: string;
  source?: string;
  courseSlug?: string;
  teacherSlug?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  status: TrialBookingStatus;
  createdAt: Date;
  updatedAt: Date;
}

const trialBookingSchema = new Schema<ITrialBooking>(
  {
    parentName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    whatsapp: { type: String, required: true, trim: true },
    learnerType: {
      type: String,
      enum: ["child", "teen", "adult"],
      required: true,
    },
    timeSlot: {
      type: String,
      enum: ["morning", "afternoon", "evening"],
    },
    teacherPreference: {
      type: String,
      enum: ["any", "female", "male"],
      default: "any",
    },
    preferredDays: [{ type: String, trim: true }],
    timezone: { type: String, trim: true },
    source: { type: String, trim: true },
    courseSlug: { type: String, trim: true },
    teacherSlug: { type: String, trim: true },
    utmSource: { type: String, trim: true },
    utmMedium: { type: String, trim: true },
    utmCampaign: { type: String, trim: true },
    utmContent: { type: String, trim: true },
    status: {
      type: String,
      enum: ["new", "contacted", "scheduled", "closed"],
      default: "new",
    },
  },
  { timestamps: true }
);

trialBookingSchema.index({ status: 1, createdAt: -1 });
trialBookingSchema.index({ email: 1, createdAt: -1 });

export const TrialBooking = mongoose.model<ITrialBooking>(
  "TrialBooking",
  trialBookingSchema
);
