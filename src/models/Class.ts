import mongoose, { Document, Schema, Types } from "mongoose";

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
}

export interface IClass extends Document {
  title: string;
  description?: string;
  teacher: Types.ObjectId;
  students: Types.ObjectId[];
  schedule?: ISchedule;
  meetingLink?: string;
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
    meetingLink: {
      type: String,
      trim: true,
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

export const Class = mongoose.model<IClass>("Class", classSchema);
