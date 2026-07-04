import mongoose, { Document, Schema, Types } from "mongoose";

export type SessionAlertType =
  | "teacher_late"
  | "student_no_show"
  | "teacher_no_show"
  | "class_live_parent"
  | "class_live_admin";

export interface ISessionAlertLog extends Document {
  sessionSlot: Types.ObjectId;
  sessionDate: string;
  alertType: SessionAlertType;
  sentAt: Date;
}

const sessionAlertLogSchema = new Schema<ISessionAlertLog>(
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
    alertType: {
      type: String,
      enum: [
        "teacher_late",
        "student_no_show",
        "teacher_no_show",
        "class_live_parent",
        "class_live_admin",
      ],
      required: true,
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false }
);

sessionAlertLogSchema.index(
  { sessionSlot: 1, sessionDate: 1, alertType: 1 },
  { unique: true }
);

export const SessionAlertLog = mongoose.model<ISessionAlertLog>(
  "SessionAlertLog",
  sessionAlertLogSchema
);
