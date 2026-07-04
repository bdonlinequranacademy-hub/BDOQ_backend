import mongoose, { Document, Schema } from "mongoose";

export type StudentAdmissionStatus =
  | "new"
  | "reviewing"
  | "approved"
  | "closed";

export interface IStudentAdmissionApplication extends Document {
  fullName: string;
  email: string;
  whatsapp: string;
  formData: Record<string, unknown>;
  locale?: "en" | "bn";
  status: StudentAdmissionStatus;
  adminNote?: string;
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
      enum: ["new", "reviewing", "approved", "closed"],
      default: "new",
    },
    adminNote: { type: String, trim: true, maxlength: 2000 },
  },
  { timestamps: true }
);

studentAdmissionApplicationSchema.index({ status: 1, createdAt: -1 });
studentAdmissionApplicationSchema.index({ email: 1, createdAt: -1 });

export const StudentAdmissionApplication = mongoose.model<IStudentAdmissionApplication>(
  "StudentAdmissionApplication",
  studentAdmissionApplicationSchema
);
