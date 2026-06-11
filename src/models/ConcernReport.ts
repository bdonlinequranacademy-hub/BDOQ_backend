import mongoose, { Document, Schema, Types } from "mongoose";

export type ConcernReportStatus = "new" | "reviewed" | "closed";
export type ConcernCategory = "poaching" | "safety" | "conduct" | "other";

export interface IConcernReport extends Document {
  reporter: Types.ObjectId;
  reporterRole: "student" | "teacher";
  reporterName: string;
  category: ConcernCategory;
  message: string;
  relatedTeacher?: Types.ObjectId;
  relatedStudent?: Types.ObjectId;
  status: ConcernReportStatus;
  adminNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const concernReportSchema = new Schema<IConcernReport>(
  {
    reporter: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reporterRole: {
      type: String,
      enum: ["student", "teacher"],
      required: true,
    },
    reporterName: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ["poaching", "safety", "conduct", "other"],
      default: "other",
    },
    message: { type: String, required: true, trim: true, maxlength: 5000 },
    relatedTeacher: { type: Schema.Types.ObjectId, ref: "User" },
    relatedStudent: { type: Schema.Types.ObjectId, ref: "User" },
    status: {
      type: String,
      enum: ["new", "reviewed", "closed"],
      default: "new",
    },
    adminNote: { type: String, trim: true, maxlength: 2000 },
  },
  { timestamps: true }
);

concernReportSchema.index({ status: 1, createdAt: -1 });

export const ConcernReport = mongoose.model<IConcernReport>(
  "ConcernReport",
  concernReportSchema
);
