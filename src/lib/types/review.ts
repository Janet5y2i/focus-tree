export type ReviewPresetPeriod = "weekly" | "biweekly" | "monthly";
export type ReviewPeriod = ReviewPresetPeriod | "custom";

export interface ReviewHighlight {
  content: string;
  loggedAt: string;
}

export interface ReviewStats {
  from: string;
  to: string;
  logCount: number;
  leafCount: number;
  fruitCount: number;
  treesNurtured: number;
  activeDays: number;
  topTree?: { title: string; leaves: number };
  highlights: ReviewHighlight[];
}

export interface ReviewResponse {
  period: ReviewPeriod;
  stats: ReviewStats;
  summary: string;
  generatedBy: "ai" | "reflection";
}
