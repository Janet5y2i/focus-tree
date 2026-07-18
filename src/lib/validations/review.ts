import { z } from "zod";

export const reviewPeriodSchema = z.enum(["weekly", "biweekly", "monthly"]);

export const PERIOD_DAYS: Record<
  z.infer<typeof reviewPeriodSchema>,
  number
> = {
  weekly: 7,
  biweekly: 14,
  monthly: 30,
};

export const PERIOD_LABEL: Record<
  z.infer<typeof reviewPeriodSchema>,
  string
> = {
  weekly: "這一週",
  biweekly: "這兩週",
  monthly: "這個月",
};
