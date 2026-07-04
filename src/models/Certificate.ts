import mongoose, { Document, Schema, Types } from "mongoose";

export interface ICertificate extends Document {
  certificateId: string;
  studentName: string;
  studentNameBn: string;
  courseName: string;
  courseNameBn: string;
  studentPortalId: string;
  issueDate: Date;
  courseDuration: string;
  grade: string;
  showExcellentBadge: boolean;
  performanceTextEn: string;
  performanceTextBn: string;
  issuedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const certificateSchema = new Schema<ICertificate>(
  {
    certificateId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    studentName: {
      type: String,
      required: true,
      trim: true,
    },
    studentNameBn: {
      type: String,
      trim: true,
      default: "",
    },
    courseName: {
      type: String,
      required: true,
      trim: true,
    },
    courseNameBn: {
      type: String,
      trim: true,
      default: "",
    },
    studentPortalId: {
      type: String,
      trim: true,
      default: "",
    },
    issueDate: {
      type: Date,
      required: true,
    },
    courseDuration: {
      type: String,
      required: true,
      trim: true,
    },
    grade: {
      type: String,
      required: true,
      trim: true,
    },
    showExcellentBadge: {
      type: Boolean,
      default: false,
    },
    performanceTextEn: {
      type: String,
      trim: true,
      default: "",
    },
    performanceTextBn: {
      type: String,
      trim: true,
      default: "",
    },
    issuedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

certificateSchema.index({ certificateId: 1 }, { unique: true });
certificateSchema.index({ createdAt: -1 });
certificateSchema.index({ studentName: 1 });

export const Certificate = mongoose.model<ICertificate>(
  "Certificate",
  certificateSchema
);
