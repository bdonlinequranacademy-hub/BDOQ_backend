import mongoose, { Document, Schema, Types } from "mongoose";

export interface ISubmission {
  student: Types.ObjectId;
  submittedAt?: Date;
  content?: string;
  grade?: string;
  feedback?: string;
}

export interface IHomework extends Document {
  title: string;
  description: string;
  class: Types.ObjectId;
  teacher: Types.ObjectId;
  dueDate: Date;
  submissions: ISubmission[];
  createdAt: Date;
  updatedAt: Date;
}

const submissionSchema = new Schema<ISubmission>(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    submittedAt: {
      type: Date,
    },
    content: {
      type: String,
    },
    grade: {
      type: String,
    },
    feedback: {
      type: String,
    },
  },
  { _id: true }
);

const homeworkSchema = new Schema<IHomework>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
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
    dueDate: {
      type: Date,
      required: true,
    },
    submissions: [submissionSchema],
  },
  { timestamps: true }
);

export const Homework = mongoose.model<IHomework>("Homework", homeworkSchema);
