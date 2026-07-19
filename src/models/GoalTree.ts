import mongoose, { Schema, type Document, type Model, Types } from "mongoose";

export interface IGoalTree extends Document {
  userId: Types.ObjectId;
  title: string;
  description?: string;
  status: "active" | "paused" | "archived";
  isCompleted: boolean;
  completedAt?: Date;
  manualOrder?: number;
  stats: {
    leafCount: number;
    fruitCount: number;
    branchCount: number;
    taskCount: number;
  };
  aiBreakdown?: {
    generatedAt: Date;
    model: string;
    accepted: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const GoalTreeSchema = new Schema<IGoalTree>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, maxlength: 120 },
    description: { type: String, maxlength: 500 },
    status: {
      type: String,
      enum: ["active", "paused", "archived"],
      default: "active",
    },
    isCompleted: { type: Boolean, default: false },
    completedAt: Date,
    manualOrder: Number,
    stats: {
      leafCount: { type: Number, default: 0, min: 0 },
      fruitCount: { type: Number, default: 0, min: 0 },
      branchCount: { type: Number, default: 0, min: 0 },
      taskCount: { type: Number, default: 0, min: 0 },
    },
    aiBreakdown: {
      generatedAt: Date,
      model: String,
      accepted: Boolean,
    },
  },
  { timestamps: true },
);

export const GoalTree: Model<IGoalTree> =
  mongoose.models.GoalTree ??
  mongoose.model<IGoalTree>("GoalTree", GoalTreeSchema);
