import mongoose, { Document, Schema, Types } from "mongoose";

export interface IProgress extends Document {
  student: Types.ObjectId;
  class: Types.ObjectId;
  surahsCompleted: string[];
  tajweedScore: number;
  memorizedAyahs: number;
  curriculumProgram?: string;
  curriculumUnit?: string;
  curriculumTopic?: string;
  notes?: string;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const progressSchema = new Schema<IProgress>(
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
    curriculumProgram: {
      type: String,
      trim: true,
    },
    curriculumUnit: {
      type: String,
      trim: true,
    },
    curriculumTopic: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

progressSchema.index({ student: 1, class: 1 });
progressSchema.index({ class: 1, updatedAt: -1 });

export const Progress = mongoose.model<IProgress>("Progress", progressSchema);
