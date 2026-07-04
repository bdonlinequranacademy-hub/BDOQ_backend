import mongoose, { Document, Schema, Types } from "mongoose";

export type SessionJoinRole = "teacher" | "student";
export type SessionJoinSource = "meeting_link" | "portal";

export interface ISessionJoin extends Document {
  sessionSlot: Types.ObjectId;
  sessionDate: string;
  user: Types.ObjectId;
  role: SessionJoinRole;
  source: SessionJoinSource;
  joinedAt: Date;
}

const sessionJoinSchema = new Schema<ISessionJoin>(
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
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ["teacher", "student"],
      required: true,
    },
    source: {
      type: String,
      enum: ["meeting_link", "portal"],
      default: "meeting_link",
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false }
);

sessionJoinSchema.index(
  { sessionSlot: 1, sessionDate: 1, user: 1 },
  { unique: true }
);
sessionJoinSchema.index({ sessionDate: 1, sessionSlot: 1 });

export const SessionJoin = mongoose.model<ISessionJoin>(
  "SessionJoin",
  sessionJoinSchema
);
