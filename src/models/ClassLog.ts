import mongoose, { Document, Schema, Types } from "mongoose";

export type ClassLogStatus = "pending" | "approved" | "rejected";

export interface ITimeSnapshot {
  time: string;
  timezone: string;
}

export interface IClassLog extends Document {
  sessionSlot: Types.ObjectId;
  class: Types.ObjectId;
  teacher: Types.ObjectId;
  student: Types.ObjectId;
  sessionDate: string;
  durationMinutes: number;
    courseType: string;
    lessonReport: string;
    topicsCovered: string[];
    curriculumProgram?: string;
    curriculumUnit?: string;
    curriculumTopic?: string;
    status: ClassLogStatus;
  adminNote?: string;
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
  earningsBdt?: number;
  times: {
    academy: ITimeSnapshot;
    teacher: ITimeSnapshot;
    student: ITimeSnapshot;
  };
  createdAt: Date;
  updatedAt: Date;
}

const timeSnapshotSchema = new Schema<ITimeSnapshot>(
  {
    time: { type: String, required: true },
    timezone: { type: String, required: true },
  },
  { _id: false }
);

const classLogSchema = new Schema<IClassLog>(
  {
    sessionSlot: {
      type: Schema.Types.ObjectId,
      ref: "SessionSlot",
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
    student: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sessionDate: {
      type: String,
      required: true,
      trim: true,
    },
    durationMinutes: {
      type: Number,
      required: true,
      min: 15,
    },
    courseType: {
      type: String,
      trim: true,
      default: "Quran",
    },
    lessonReport: {
      type: String,
      required: true,
      trim: true,
    },
    topicsCovered: {
      type: [String],
      default: [],
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
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    adminNote: {
      type: String,
      trim: true,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: {
      type: Date,
    },
    earningsBdt: {
      type: Number,
      min: 0,
    },
    times: {
      academy: { type: timeSnapshotSchema, required: true },
      teacher: { type: timeSnapshotSchema, required: true },
      student: { type: timeSnapshotSchema, required: true },
    },
  },
  { timestamps: true }
);

classLogSchema.index({ student: 1, sessionDate: -1 });
classLogSchema.index({ student: 1, class: 1, sessionDate: -1 });
classLogSchema.index({ teacher: 1, status: 1, sessionDate: -1 });
classLogSchema.index({ teacher: 1, sessionDate: -1 });
classLogSchema.index({ sessionDate: 1, status: 1 });
classLogSchema.index({ status: 1, createdAt: -1 });
classLogSchema.index({ sessionSlot: 1, status: 1, sessionDate: -1 });
classLogSchema.index({ sessionSlot: 1, sessionDate: 1 }, { unique: true });

export const ClassLog = mongoose.model<IClassLog>("ClassLog", classLogSchema);
