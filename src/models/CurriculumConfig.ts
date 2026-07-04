import mongoose, { Document, Schema } from "mongoose";

export interface ICurriculumNodeDoc {
  id: string;
  label: string;
  labelBn?: string;
  children?: ICurriculumNodeDoc[];
}

export interface ICurriculumConfig extends Document {
  key: string;
  tree: ICurriculumNodeDoc[];
  schemaVersion?: number;
  updatedAt: Date;
}

const curriculumNodeSchema = new Schema<ICurriculumNodeDoc>(
  {
    id: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    labelBn: { type: String, trim: true },
    children: { type: [], default: undefined },
  },
  { _id: false }
);

curriculumNodeSchema.add({
  children: [curriculumNodeSchema],
});

const curriculumConfigSchema = new Schema<ICurriculumConfig>(
  {
    key: { type: String, required: true, unique: true, default: "default" },
    tree: { type: [curriculumNodeSchema], default: [] },
    schemaVersion: { type: Number, default: 1 },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

export const CurriculumConfig = mongoose.model<ICurriculumConfig>(
  "CurriculumConfig",
  curriculumConfigSchema
);
