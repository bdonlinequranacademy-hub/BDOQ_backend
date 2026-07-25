import mongoose, { Document, Schema, Types } from "mongoose";

export type UserRole = "student" | "teacher" | "admin" | "super_admin";
export type AuthProvider = "local" | "google";
export type UserGender = "male" | "female";

export interface ICurriculumAssignment {
  programId: string;
  unitId?: string;
  topicId?: string;
  completed?: boolean;
  completedAt?: Date;
}

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  isActive: boolean;
  authProvider: AuthProvider;
  providerId: string | null;
  children?: Types.ObjectId[];
  studentId?: string | null;
  gender?: UserGender;
  timezone?: string;
  country?: string;
  curriculumAssignments?: ICurriculumAssignment[];
  meetingLink?: string;
  bankName?: string;
  bankAccount?: string;
  bKashNumber?: string;
  whatsapp?: string;
  avatarUrl?: string;
  avatarPublicId?: string;
  emailVerified: boolean;
  emailVerificationToken: string | null;
  emailVerificationExpiry: Date | null;
  passwordResetToken: string | null;
  passwordResetExpiry: Date | null;
  createdAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    role: {
      type: String,
      enum: ["student", "teacher", "admin", "super_admin"],
      default: "student",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
    providerId: {
      type: String,
      default: null,
    },
    children: {
      type: [{ type: Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
    studentId: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },
    gender: {
      type: String,
      enum: ["male", "female"],
    },
    timezone: {
      type: String,
      trim: true,
      default: "Asia/Dhaka",
    },
    country: {
      type: String,
      trim: true,
      default: "",
    },
    curriculumAssignments: {
      type: [
        {
          programId: { type: String, required: true, trim: true },
          unitId: { type: String, trim: true },
          topicId: { type: String, trim: true },
          completed: { type: Boolean, default: false },
          completedAt: { type: Date },
        },
      ],
      default: [],
    },
    meetingLink: {
      type: String,
      trim: true,
      default: "",
    },
    bankName: {
      type: String,
      trim: true,
      default: "",
    },
    bankAccount: {
      type: String,
      trim: true,
      default: "",
    },
    bKashNumber: {
      type: String,
      trim: true,
      default: "",
    },
    whatsapp: {
      type: String,
      trim: true,
      default: "",
    },
    avatarUrl: {
      type: String,
      trim: true,
      default: "",
    },
    avatarPublicId: {
      type: String,
      trim: true,
      default: "",
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
      default: null,
    },
    emailVerificationExpiry: {
      type: Date,
      default: null,
    },
    passwordResetToken: {
      type: String,
      default: null,
    },
    passwordResetExpiry: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ role: 1, "curriculumAssignments.0": 1 });

export const User = mongoose.model<IUser>("User", userSchema);
