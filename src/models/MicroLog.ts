import mongoose, { Schema, type Document, type Model, Types } from "mongoose";

const NodeLinkSchema = new Schema(
  {
    treeId: { type: Schema.Types.ObjectId, ref: "GoalTree", required: true },
    nodeId: { type: Schema.Types.ObjectId, ref: "GoalNode", required: true },
    nodeLevel: { type: Number, enum: [2, 3] },
    anchorNodeId: { type: Schema.Types.ObjectId, ref: "GoalNode" },
  },
  { _id: false },
);

export interface IMicroLog extends Document {
  userId: Types.ObjectId;
  content: string;
  mood: "calm" | "grateful" | "focused" | "neutral";
  nodeLinks: Array<{
    treeId: Types.ObjectId;
    nodeId: Types.ObjectId;
    nodeLevel?: 2 | 3;
    anchorNodeId?: Types.ObjectId;
  }>;
  leafEmittedForTreeIds: Types.ObjectId[];
  loggedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MicroLogSchema = new Schema<IMicroLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    content: { type: String, required: true, maxlength: 300 },
    mood: {
      type: String,
      enum: ["calm", "grateful", "focused", "neutral"],
      default: "neutral",
    },
    nodeLinks: [NodeLinkSchema],
    leafEmittedForTreeIds: [{ type: Schema.Types.ObjectId, ref: "GoalTree" }],
    loggedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true },
);

MicroLogSchema.index({ userId: 1, loggedAt: -1 });

export const MicroLog: Model<IMicroLog> =
  mongoose.models.MicroLog ??
  mongoose.model<IMicroLog>("MicroLog", MicroLogSchema);
