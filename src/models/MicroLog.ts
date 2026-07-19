import mongoose, { Schema, type Document, type Model, Types } from "mongoose";
import type { MicroLogMood } from "@/lib/types/micro-log";

const PRESET_MOODS: MicroLogMood[] = [
  "calm",
  "grateful",
  "focused",
  "joyful",
  "tired",
  "anxious",
  "neutral",
  "sad",
];

const NodeLinkSchema = new Schema(
  {
    treeId: { type: Schema.Types.ObjectId, ref: "GoalTree", required: true },
    nodeId: { type: Schema.Types.ObjectId, ref: "GoalNode", required: true },
    nodeLevel: { type: Number, enum: [2, 3] },
    anchorNodeId: { type: Schema.Types.ObjectId, ref: "GoalNode" },
    nodeTitle: { type: String, required: true, maxlength: 100 },
  },
  { _id: false },
);

export interface IMicroLog extends Document {
  userId: Types.ObjectId;
  content: string;
  /** @deprecated 舊資料單一心情；新寫入請用 moods */
  mood?: MicroLogMood;
  moods: MicroLogMood[];
  customMood?: string;
  treeIds: Types.ObjectId[];
  nodeLinks: Array<{
    treeId: Types.ObjectId;
    nodeId: Types.ObjectId;
    nodeLevel?: 2 | 3;
    anchorNodeId?: Types.ObjectId;
    nodeTitle: string;
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
    // 保留舊欄位以相容既有文件；新寫入改存 moods。
    mood: {
      type: String,
      enum: PRESET_MOODS,
    },
    moods: {
      type: [{ type: String, enum: PRESET_MOODS }],
      default: [],
    },
    customMood: { type: String, maxlength: 40 },
    treeIds: [{ type: Schema.Types.ObjectId, ref: "GoalTree" }],
    nodeLinks: [NodeLinkSchema],
    leafEmittedForTreeIds: [{ type: Schema.Types.ObjectId, ref: "GoalTree" }],
    loggedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true },
);

MicroLogSchema.index({ userId: 1, loggedAt: -1 });
MicroLogSchema.index({ userId: 1, createdAt: -1 });
MicroLogSchema.index({ userId: 1, mood: 1, createdAt: -1 });
MicroLogSchema.index({ userId: 1, moods: 1, createdAt: -1 });
MicroLogSchema.index({ userId: 1, treeIds: 1, createdAt: -1 });
MicroLogSchema.index({ userId: 1, "nodeLinks.nodeId": 1, createdAt: -1 });

export const MicroLog: Model<IMicroLog> =
  mongoose.models.MicroLog ??
  mongoose.model<IMicroLog>("MicroLog", MicroLogSchema);
