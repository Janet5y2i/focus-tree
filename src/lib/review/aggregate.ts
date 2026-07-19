import { GoalNode } from "@/models/GoalNode";
import { GoalTree } from "@/models/GoalTree";
import { MicroLog } from "@/models/MicroLog";
import type { ReviewPeriod, ReviewStats } from "@/lib/types/review";
import { PERIOD_DAYS } from "@/lib/validations/review";

const MAX_HIGHLIGHTS_FOR_AI = 12;

/**
 * 彙整某段期間的「成長」資料。
 *
 * 無焦慮鐵律：這裡只統計「已經發生」的正向指標
 * （記錄數、長出的葉子、結出的果實、照顧到的樹）。
 * 絕不計算或回傳未完成、逾期、落後等任何會製造壓力的數字。
 */
export async function buildReviewStats(
  userId: string,
  period: ReviewPeriod,
  customRange?: { from: string; to: string },
): Promise<ReviewStats> {
  let from: Date;
  let to: Date;

  if (period === "custom") {
    if (!customRange) throw new Error("Custom review range is required");
    from = new Date(`${customRange.from}T00:00:00.000Z`);
    to = new Date(`${customRange.to}T23:59:59.999Z`);
  } else {
    to = new Date();
    from = new Date(
      to.getTime() - PERIOD_DAYS[period] * 24 * 60 * 60 * 1000,
    );
  }

  const [logs, ripenedFruits] = await Promise.all([
    MicroLog.find({
      userId,
      loggedAt: { $gte: from, $lte: to },
    }).sort({ loggedAt: -1 }),
    GoalNode.countDocuments({
      userId,
      type: "task",
      fruitEarned: true,
      completedAt: { $gte: from, $lte: to },
    }),
  ]);

  let leafCount = 0;
  const activeDays = new Set<string>();
  const leavesPerTree = new Map<string, number>();

  for (const log of logs) {
    activeDays.add(log.loggedAt.toISOString().slice(0, 10));
    for (const treeId of log.treeIds) {
      leafCount += 1;
      const key = treeId.toString();
      leavesPerTree.set(key, (leavesPerTree.get(key) ?? 0) + 1);
    }
  }

  const topTree = await resolveTopTree(userId, leavesPerTree);

  // 該期間所有有文字的微小記錄，由新到舊；完整列表給 UI，AI 只取較新幾則避免 prompt 過長。
  const highlights = logs
    .filter((log) => log.content.trim().length > 0)
    .map((log) => ({
      content: log.content.trim(),
      loggedAt: log.loggedAt.toISOString(),
    }));

  return {
    from: from.toISOString(),
    to: to.toISOString(),
    logCount: logs.length,
    leafCount,
    fruitCount: ripenedFruits,
    treesNurtured: leavesPerTree.size,
    activeDays: activeDays.size,
    topTree,
    highlights,
  };
}

export function highlightsForPrompt(
  highlights: ReviewStats["highlights"],
): string[] {
  return highlights.slice(0, MAX_HIGHLIGHTS_FOR_AI).map((item) => item.content);
}

async function resolveTopTree(
  userId: string,
  leavesPerTree: Map<string, number>,
): Promise<ReviewStats["topTree"]> {
  if (leavesPerTree.size === 0) return undefined;

  let topId: string | null = null;
  let topLeaves = 0;
  for (const [treeId, leaves] of leavesPerTree) {
    if (leaves > topLeaves) {
      topLeaves = leaves;
      topId = treeId;
    }
  }

  if (!topId) return undefined;

  const tree = await GoalTree.findOne({ _id: topId, userId });
  if (!tree) return undefined;

  return { title: tree.title, leaves: topLeaves };
}
