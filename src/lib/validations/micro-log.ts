import { z } from "zod";
import { objectIdSchema } from "./tree";

export const createMicroLogSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "寫下剛剛完成的一件小事吧")
    .max(300, "記錄最多 300 字"),
  treeIds: z
    .array(objectIdSchema)
    .max(12, "一次最多連結 12 棵目標樹")
    .default([]),
});

export type CreateMicroLogInput = z.infer<typeof createMicroLogSchema>;
