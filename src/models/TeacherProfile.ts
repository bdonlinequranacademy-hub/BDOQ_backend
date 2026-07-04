import mongoose, { Document, Schema, Types } from "mongoose";

export type TeacherProfileGender = "male" | "female";

export interface ITeacherProfile extends Document {
  slug: string;
  name: string;
  role: string;
  bio: string;
  about?: string;
  gender: TeacherProfileGender;
  country?: string;
  location?: string;
  address?: string;
  dateOfBirth?: string;
  age?: string;
  avatarUrl?: string;
  featured: boolean;
  showOnWebsite: boolean;
  sortOrder: number;
  qualifications: string[];
  skills: string[];
  experience?: string;
  languages: string[];
  courseSlugs: string[];
  linkedUserId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const teacherProfileSchema = new Schema<ITeacherProfile>(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    name: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    bio: { type: String, required: true, trim: true },
    about: { type: String, trim: true },
    gender: {
      type: String,
      enum: ["male", "female"],
      required: true,
    },
    country: { type: String, trim: true },
    location: { type: String, trim: true },
    address: { type: String, trim: true },
    dateOfBirth: { type: String, trim: true },
    age: { type: String, trim: true },
    avatarUrl: { type: String, trim: true },
    featured: { type: Boolean, default: false },
    showOnWebsite: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    qualifications: { type: [String], default: [] },
    skills: { type: [String], default: [] },
    experience: { type: String, trim: true },
    languages: { type: [String], default: [] },
    courseSlugs: { type: [String], default: [] },
    linkedUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

teacherProfileSchema.index({ showOnWebsite: 1, gender: 1, sortOrder: 1 });
teacherProfileSchema.index({ featured: 1, sortOrder: 1 });

export const TeacherProfile = mongoose.model<ITeacherProfile>(
  "TeacherProfile",
  teacherProfileSchema
);
