import mongoose, { Document, Schema, Types } from "mongoose";

export type StudentRequestStatus = "pending" | "approved" | "rejected";

export interface IStudentRequest extends Document {
  teacher: Types.ObjectId;
  message: string;
  preferredCourseType?: string;
  status: StudentRequestStatus;
  adminNote?: string;
  resolvedBy?: Types.ObjectId;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const studentRequestSchema = new Schema<IStudentRequest>(
  {
    teacher: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    preferredCourseType: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    adminNote: {
      type: String,
      trim: true,
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    resolvedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

studentRequestSchema.index({ teacher: 1, status: 1, createdAt: -1 });
studentRequestSchema.index({ status: 1, createdAt: -1 });

export const StudentRequest = mongoose.model<IStudentRequest>(
  "StudentRequest",
  studentRequestSchema
);
