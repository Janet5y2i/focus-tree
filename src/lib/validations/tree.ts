import { z } from "zod";

export const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "無效的 ID");

export const createTreeSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "請為這棵樹取個名字")
    .max(120, "目標名稱最多 120 字"),
  description: z.string().trim().max(500, "描述最多 500 字").optional(),
});

export const updateTreeSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "請為這棵樹取個名字")
      .max(120, "目標名稱最多 120 字")
      .optional(),
    description: z.string().trim().max(500, "描述最多 500 字").optional(),
    status: z.enum(["active", "paused", "archived"]).optional(),
  })
  .refine(
    (data) => Object.values(data).some((value) => value !== undefined),
    "沒有可更新的欄位",
  );

export const createNodeSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "請輸入名稱")
    .max(100, "名稱最多 100 字"),
  // 省略 parentId（或等於 treeId）＝ 長出子目標（Level 2）
  // 指向 Level 2 節點＝在其下長出任務（Level 3）
  parentId: objectIdSchema.optional(),
});

export const updateNodeSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "請輸入名稱")
      .max(100, "名稱最多 100 字")
      .optional(),
    isCompleted: z.boolean().optional(),
  })
  .refine(
    (data) => Object.values(data).some((value) => value !== undefined),
    "沒有可更新的欄位",
  );

export type CreateTreeInput = z.infer<typeof createTreeSchema>;
export type UpdateTreeInput = z.infer<typeof updateTreeSchema>;
export type CreateNodeInput = z.infer<typeof createNodeSchema>;
export type UpdateNodeInput = z.infer<typeof updateNodeSchema>;
