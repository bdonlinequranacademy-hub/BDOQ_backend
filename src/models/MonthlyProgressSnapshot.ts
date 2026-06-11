import mongoose, { Document, Schema, Types } from "mongoose";

export interface IMonthlyQaItem {
  question: string;
  answer: string;
}

export interface IMonthlyProgressSnapshot extends Document {
  student: Types.ObjectId;
  class: Types.ObjectId;
  teacher: Types.ObjectId;
  month: string;
  surahsCompleted: string[];
  tajweedScore: number;
  memorizedAyahs: number;
  teacherSummary?: string;
  qaResponses: IMonthlyQaItem[];
  activityDates: string[];
  sessionsHeld: number;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const qaItemSchema = new Schema<IMonthlyQaItem>(
  {
    question: { type: String, required: true, trim: true },
    answer: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const monthlyProgressSchema = new Schema<IMonthlyProgressSnapshot>(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    class: {
      type: Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },
    teacher: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    month: {
      type: String,
      required: true,
      trim: true,
      match: /^\d{4}-\d{2}$/,
    },
    surahsCompleted: {
      type: [String],
      default: [],
    },
    tajweedScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    memorizedAyahs: {
      type: Number,
      default: 0,
      min: 0,
    },
    teacherSummary: {
      type: String,
      trim: true,
    },
    qaResponses: {
      type: [qaItemSchema],
      default: [],
    },
    activityDates: {
      type: [String],
      default: [],
    },
    sessionsHeld: {
      type: Number,
      default: 0,
      min: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

monthlyProgressSchema.index({ student: 1, class: 1, month: 1 }, { unique: true });
monthlyProgressSchema.index({ teacher: 1, month: 1 });

export const MonthlyProgressSnapshot = mongoose.model<IMonthlyProgressSnapshot>(
  "MonthlyProgressSnapshot",
  monthlyProgressSchema
);

export const DEFAULT_MONTHLY_QUESTIONS = [
  "What progress did the student make this month?",
  "Which areas need more focus next month?",
  "Message for parents/guardians?",
] as const;
