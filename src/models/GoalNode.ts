import mongoose, { Schema, type Document, type Model, Types } from "mongoose";

export interface IGoalNode extends Document {
  treeId: Types.ObjectId;
  userId: Types.ObjectId;
  parentId: Types.ObjectId;
  level: 2 | 3;
  type: "branch" | "task";
  title: string;
  order: number;
  isCompleted: boolean;
  completedAt?: Date;
  fruitEarned: boolean;
  layout?: { x: number; y: number; angle: number };
  createdAt: Date;
  updatedAt: Date;
}

const GoalNodeSchema = new Schema<IGoalNode>(
  {
    treeId: { type: Schema.Types.ObjectId, ref: "GoalTree", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    parentId: { type: Schema.Types.ObjectId, required: true, index: true },
    level: { type: Number, required: true, enum: [2, 3] },
    type: { type: String, required: true, enum: ["branch", "task"] },
    title: { type: String, required: true, maxlength: 100 },
    order: { type: Number, default: 0 },
    isCompleted: { type: Boolean, default: false },
    completedAt: Date,
    fruitEarned: { type: Boolean, default: false },
    layout: {
      x: Number,
      y: Number,
      angle: Number,
    },
  },
  { timestamps: true },
);

GoalNodeSchema.index({ treeId: 1, level: 1, order: 1 });
GoalNodeSchema.index({ treeId: 1, parentId: 1 });

export const GoalNode: Model<IGoalNode> =
  mongoose.models.GoalNode ??
  mongoose.model<IGoalNode>("GoalNode", GoalNodeSchema);
