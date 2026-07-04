import mongoose, { Document, Schema, Types } from "mongoose";

export interface IClassReminderLog extends Document {
  sessionSlot: Types.ObjectId;
  sessionDate: string;
  sentAt: Date;
}

const classReminderLogSchema = new Schema<IClassReminderLog>(
  {
    sessionSlot: {
      type: Schema.Types.ObjectId,
      ref: "SessionSlot",
      required: true,
    },
    sessionDate: {
      type: String,
      required: true,
      trim: true,
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false }
);

classReminderLogSchema.index(
  { sessionSlot: 1, sessionDate: 1 },
  { unique: true }
);

export const ClassReminderLog = mongoose.model<IClassReminderLog>(
  "ClassReminderLog",
  classReminderLogSchema
);
