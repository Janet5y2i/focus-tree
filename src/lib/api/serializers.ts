import type { IGoalTree } from "@/models/GoalTree";
import type { IGoalNode } from "@/models/GoalNode";
import type { IMicroLog } from "@/models/MicroLog";
import type { TreeDTO, NodeDTO } from "@/lib/types/tree";
import type { MicroLogDTO } from "@/lib/types/micro-log";

export function toTreeDTO(tree: IGoalTree): TreeDTO {
  return {
    id: tree._id.toString(),
    title: tree.title,
    description: tree.description,
    status: tree.status,
    isCompleted: tree.isCompleted,
    completedAt: tree.completedAt?.toISOString(),
    manualOrder: tree.manualOrder,
    stats: {
      leafCount: tree.stats.leafCount,
      fruitCount: tree.stats.fruitCount,
      branchCount: tree.stats.branchCount,
      taskCount: tree.stats.taskCount,
    },
    createdAt: tree.createdAt.toISOString(),
  };
}

export function toNodeDTO(node: IGoalNode): NodeDTO {
  return {
    id: node._id.toString(),
    treeId: node.treeId.toString(),
    parentId: node.parentId.toString(),
    level: node.level,
    type: node.type,
    title: node.title,
    order: node.order,
    isCompleted: node.isCompleted,
    completedAt: node.completedAt?.toISOString(),
    fruitEarned: node.fruitEarned,
    isRecurring: node.isRecurring,
  };
}

export function toMicroLogDTO(log: IMicroLog): MicroLogDTO {
  // 舊資料只有單一 mood；新資料用 moods 陣列。
  const moods =
    log.moods && log.moods.length > 0
      ? log.moods
      : log.mood
        ? [log.mood]
        : [];

  return {
    id: log._id.toString(),
    content: log.content,
    moods,
    customMood: log.customMood?.trim() || undefined,
    treeIds: log.treeIds.map((treeId) => treeId.toString()),
    nodeLinks: log.nodeLinks.map((link) => ({
      treeId: link.treeId.toString(),
      nodeId: link.nodeId.toString(),
      nodeLevel: link.nodeLevel,
      nodeTitle: link.nodeTitle,
    })),
    loggedAt: log.loggedAt.toISOString(),
  };
}
