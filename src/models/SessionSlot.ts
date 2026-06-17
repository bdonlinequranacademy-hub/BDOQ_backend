import mongoose, { Document, Schema, Types } from "mongoose";
import type { ScheduleDay } from "./Class";

export type SessionPhase = "upcoming" | "live" | "completed";

export interface ISessionSlot extends Document {
  class: Types.ObjectId;
  teacher: Types.ObjectId;
  student: Types.ObjectId;
  day: ScheduleDay;
  startTime: string;
  durationMinutes: number;
  courseType: string;
  isActive: boolean;
  sessionPhase?: SessionPhase;
  createdAt: Date;
  updatedAt: Date;
}

const sessionSlotSchema = new Schema<ISessionSlot>(
  {
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
    startTime: {
      type: String,
      required: true,
      trim: true,
    },
    durationMinutes: {
      type: Number,
      default: 60,
      min: 15,
    },
    courseType: {
      type: String,
      trim: true,
      default: "Quran",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    sessionPhase: {
      type: String,
      enum: ["upcoming", "live", "completed"],
      default: "upcoming",
    },
  },
  { timestamps: true }
);

sessionSlotSchema.index({ teacher: 1, day: 1, isActive: 1 });
sessionSlotSchema.index({ student: 1, day: 1, isActive: 1 });
sessionSlotSchema.index({ student: 1, isActive: 1 });
sessionSlotSchema.index({ day: 1, isActive: 1 });
sessionSlotSchema.index({ class: 1, day: 1, isActive: 1 });
sessionSlotSchema.index({ class: 1, student: 1, day: 1 }, { unique: true });

export const SessionSlot = mongoose.model<ISessionSlot>(
  "SessionSlot",
  sessionSlotSchema
);
