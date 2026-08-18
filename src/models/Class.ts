import mongoose, { Document, Schema, Types } from "mongoose";
import type { TrialMeetingPlatform } from "../lib/trialMeetingPlatform";

export type ScheduleDay =
  | "Saturday"
  | "Sunday"
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday";

export interface ISchedule {
  day: ScheduleDay;
  time: string;
  duration: number;
  /** When true (default), repeats every week on `day`. When false, one session only on the next `day`. */
  repeatWeekly?: boolean;
}

export interface IClass extends Document {
  title: string;
  description?: string;
  teacher: Types.ObjectId;
  students: Types.ObjectId[];
  schedule?: ISchedule;
  curriculum?: {
    programId?: string;
    unitId?: string;
    topicId?: string;
  };
  meetingLink?: string;
  meetingPlatform?: TrialMeetingPlatform;
  sessionRateBdt?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const scheduleSchema = new Schema<ISchedule>(
  {
    day: {
      type: String,
      enum: [
        "Saturday",
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
      ],
      required: true,
    },
    time: {
      type: String,
      required: true,
    },
    duration: {
      type: Number,
      default: 60,
    },
    repeatWeekly: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
);

const classSchema = new Schema<IClass>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    teacher: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    students: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    schedule: scheduleSchema,
    curriculum: {
      programId: { type: String, trim: true },
      unitId: { type: String, trim: true },
      topicId: { type: String, trim: true },
    },
    meetingLink: {
      type: String,
      trim: true,
    },
    meetingPlatform: {
      type: String,
      enum: ["google_meet", "zoom", "teams", "whatsapp", "custom"],
    },
    sessionRateBdt: {
      type: Number,
      min: 0,
      default: 500,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

classSchema.index({ teacher: 1, isActive: 1 });
classSchema.index({ students: 1 });
classSchema.index({ "schedule.day": 1, isActive: 1 });

export const Class = mongoose.model<IClass>("Class", classSchema);
