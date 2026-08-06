import mongoose, { Document, Schema } from "mongoose";

export type TrialBookingStatus = "new" | "contacted" | "scheduled" | "closed";

export type TrialMeetingPlatform =
  | "google_meet"
  | "zoom"
  | "teams"
  | "whatsapp"
  | "custom";

export interface ITrialBooking extends Document {
  parentName: string;
  studentName?: string;
  email?: string;
  whatsapp: string;
  country?: string;
  age?: string;
  learnerGender?: "male" | "female";
  learnerType: "child" | "teen" | "adult";
  preferredTrialDate?: string;
  preferredTrialTime?: string;
  additionalNote?: string;
  timeSlot?: "anytime" | "early_morning" | "morning" | "afternoon" | "evening" | "late_evening";
  teacherPreference: "any" | "female" | "male";
  preferredDays: string[];
  timezone?: string;
  source?: string;
  courseSlug?: string;
  teacherSlug?: string;
  meetingPlatform?: TrialMeetingPlatform;
  meetingLink?: string;
  invitationSentAt?: Date;
  convertedAdmissionId?: mongoose.Types.ObjectId;
  convertedUserId?: mongoose.Types.ObjectId;
  convertedAt?: Date;
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
    studentName: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    whatsapp: { type: String, required: true, trim: true },
    country: { type: String, trim: true },
    age: { type: String, trim: true },
    learnerGender: {
      type: String,
      enum: ["male", "female"],
    },
    learnerType: {
      type: String,
      enum: ["child", "teen", "adult"],
      required: true,
    },
    preferredTrialDate: { type: String, trim: true },
    preferredTrialTime: { type: String, trim: true },
    additionalNote: { type: String, trim: true },
    timeSlot: {
      type: String,
      enum: ["anytime", "early_morning", "morning", "afternoon", "evening", "late_evening"],
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
    meetingPlatform: {
      type: String,
      enum: ["google_meet", "zoom", "teams", "whatsapp", "custom"],
    },
    meetingLink: { type: String, trim: true },
    invitationSentAt: { type: Date },
    convertedAdmissionId: { type: Schema.Types.ObjectId, ref: "StudentAdmissionApplication" },
    convertedUserId: { type: Schema.Types.ObjectId, ref: "User" },
    convertedAt: { type: Date },
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
