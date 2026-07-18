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
  };
}

export function toMicroLogDTO(log: IMicroLog): MicroLogDTO {
  return {
    id: log._id.toString(),
    content: log.content,
    mood: log.mood,
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
