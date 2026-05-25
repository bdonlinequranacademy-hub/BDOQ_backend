import mongoose, { Document, Schema, Types } from "mongoose";

export type AttendanceStatus = "present" | "absent" | "late";

export interface IAttendance extends Document {
  class: Types.ObjectId;
  student: Types.ObjectId;
  date: Date;
  status: AttendanceStatus;
  markedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const attendanceSchema = new Schema<IAttendance>(
  {
    class: {
      type: Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },
    student: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["present", "absent", "late"],
      default: "absent",
    },
    markedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export const Attendance = mongoose.model<IAttendance>(
  "Attendance",
  attendanceSchema
);
