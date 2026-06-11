import mongoose, { Document, Schema, Types } from "mongoose";

export type HomeworkSubmissionStatus =
  | "pending_review"
  | "approved"
  | "returned"
  | "graded";

export interface ISubmission {
  _id?: Types.ObjectId;
  student: Types.ObjectId;
  submittedAt?: Date;
  content?: string;
  status?: HomeworkSubmissionStatus;
  reviewFeedback?: string;
  reviewedAt?: Date;
  grade?: string;
  feedback?: string;
}

export interface IHomework extends Document {
  title: string;
  description: string;
  class: Types.ObjectId;
  teacher: Types.ObjectId;
  dueDate: Date;
  curriculumProgram?: string;
  curriculumUnit?: string;
  curriculumTopic?: string;
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
    status: {
      type: String,
      enum: ["pending_review", "approved", "returned", "graded"],
    },
    reviewFeedback: {
      type: String,
    },
    reviewedAt: {
      type: Date,
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
    submissions: [submissionSchema],
  },
  { timestamps: true }
);

export const Homework = mongoose.model<IHomework>("Homework", homeworkSchema);

export function resolveSubmissionStatus(
  submission: ISubmission | undefined
): HomeworkSubmissionStatus | null {
  if (!submission?.submittedAt) return null;
  if (submission.status) return submission.status;
  if (submission.grade) return "graded";
  return "approved";
}

export function isSubmissionAccepted(status: HomeworkSubmissionStatus | null): boolean {
  return status === "approved" || status === "graded";
}
