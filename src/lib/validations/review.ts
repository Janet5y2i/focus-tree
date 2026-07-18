import { z } from "zod";
import type { ReviewPeriod, ReviewPresetPeriod } from "@/lib/types/review";

export const reviewPresetPeriodSchema = z.enum([
  "weekly",
  "biweekly",
  "monthly",
]);
export const reviewPeriodSchema = z.enum([
  "weekly",
  "biweekly",
  "monthly",
  "custom",
]);

export const PERIOD_DAYS: Record<ReviewPresetPeriod, number> = {
  weekly: 7,
  biweekly: 14,
  monthly: 30,
};

export const PERIOD_LABEL: Record<ReviewPeriod, string> = {
  weekly: "這一週",
  biweekly: "這兩週",
  monthly: "這個月",
  custom: "這段時間",
};

const dateInputSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式無效");

export const reviewQuerySchema = z
  .object({
    period: reviewPeriodSchema,
    from: dateInputSchema.optional(),
    to: dateInputSchema.optional(),
  })
  .superRefine(({ period, from, to }, context) => {
    if (period !== "custom") return;
    if (!from || !to) {
      context.addIssue({
        code: "custom",
        message: "自訂回顧需要開始與結束日期",
      });
      return;
    }
    if (from > to) {
      context.addIssue({
        code: "custom",
        message: "開始日期不能晚於結束日期",
      });
      return;
    }
    const days =
      (new Date(`${to}T00:00:00Z`).getTime() -
        new Date(`${from}T00:00:00Z`).getTime()) /
      (24 * 60 * 60 * 1000);
    if (days > 366) {
      context.addIssue({
        code: "custom",
        message: "自訂回顧範圍最多一年",
      });
    }
  });
