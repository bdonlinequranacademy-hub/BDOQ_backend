import mongoose, { Document, Schema } from "mongoose";

export type TeacherApplicationStatus =
  | "new"
  | "reviewing"
  | "approved"
  | "rejected"
  | "closed";

export interface ITeacherApplicationFiles {
  certificateUrl?: string;
  certificatePublicId?: string;
  cvUrl?: string;
  cvPublicId?: string;
  profilePhotoUrl?: string;
  profilePhotoPublicId?: string;
  screenshotUrl?: string;
  screenshotPublicId?: string;
}

export interface ITeacherApplication extends Document {
  fullName: string;
  email: string;
  phone: string;
  formData: Record<string, unknown>;
  files: ITeacherApplicationFiles;
  locale?: "en" | "bn";
  status: TeacherApplicationStatus;
  adminNote?: string;
  linkedUserId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const teacherApplicationSchema = new Schema<ITeacherApplication>(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    formData: { type: Schema.Types.Mixed, required: true },
    files: {
      certificateUrl: String,
      certificatePublicId: String,
      cvUrl: String,
      cvPublicId: String,
      profilePhotoUrl: String,
      profilePhotoPublicId: String,
      screenshotUrl: String,
      screenshotPublicId: String,
    },
    locale: { type: String, enum: ["en", "bn"] },
    status: {
      type: String,
      enum: ["new", "reviewing", "approved", "rejected", "closed"],
      default: "new",
    },
    adminNote: { type: String, trim: true, maxlength: 2000 },
    linkedUserId: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

teacherApplicationSchema.index({ status: 1, createdAt: -1 });
teacherApplicationSchema.index({ email: 1, createdAt: -1 });

export const TeacherApplication = mongoose.model<ITeacherApplication>(
  "TeacherApplication",
  teacherApplicationSchema
);
