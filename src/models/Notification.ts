import mongoose, { Document, Schema, Types } from "mongoose";

export type NotificationType =
  | "class"
  | "homework"
  | "attendance"
  | "general";

export interface INotification extends Document {
  user: Types.ObjectId;
  title: string;
  message: string;
  type?: NotificationType;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["class", "homework", "attendance", "general"],
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export const Notification = mongoose.model<INotification>(
  "Notification",
  notificationSchema
);
