import { GoalNode } from "@/models/GoalNode";
import { GoalTree } from "@/models/GoalTree";
import { MicroLog } from "@/models/MicroLog";
import type { ForestBranchData, ForestTreeData } from "@/lib/types/forest";

/**
 * 彙整森林全景需要的資料：
 * 樹幹＝主目標、樹枝＝子目標、葉子＝連結的記錄、果實＝勾選完成的任務。
 */
export async function buildForestData(
  userId: string,
): Promise<ForestTreeData[]> {
  const [trees, nodes, logs] = await Promise.all([
    GoalTree.find({ userId }).sort({ createdAt: 1 }),
    GoalNode.find({ userId }).sort({ level: 1, order: 1 }),
    MicroLog.find({ userId, "treeIds.0": { $exists: true } }).select(
      "treeIds nodeLinks",
    ),
  ]);

  const forest = new Map<string, ForestTreeData>();
  const branchesById = new Map<string, ForestBranchData>();

  for (const tree of trees) {
    forest.set(tree._id.toString(), {
      id: tree._id.toString(),
      title: tree.title,
      isCompleted: tree.isCompleted,
      trunkLeafCount: 0,
      branches: [],
    });
  }

  for (const node of nodes) {
    const tree = forest.get(node.treeId.toString());
    if (!tree) continue;

    if (node.level === 2) {
      const branch: ForestBranchData = {
        id: node._id.toString(),
        title: node.title,
        leafCount: 0,
        tasks: [],
      };
      branchesById.set(branch.id, branch);
      tree.branches.push(branch);
    } else {
      branchesById.get(node.parentId.toString())?.tasks.push({
        id: node._id.toString(),
        isCompleted: node.isCompleted,
      });
    }
  }

  for (const log of logs) {
    for (const treeId of log.treeIds) {
      const tree = forest.get(treeId.toString());
      if (!tree) continue;

      // 找出這筆記錄在這棵樹上錨定到的樹枝；
      // 勾選任務（Level 3）時葉子長在其所屬樹枝上。
      const anchorBranchIds = new Set<string>();
      for (const link of log.nodeLinks) {
        if (link.treeId.toString() !== treeId.toString()) continue;
        const branchId =
          link.nodeLevel === 2
            ? link.nodeId.toString()
            : link.anchorNodeId?.toString();
        if (branchId && branchesById.has(branchId)) {
          anchorBranchIds.add(branchId);
        }
      }

      if (anchorBranchIds.size === 0) {
        tree.trunkLeafCount += 1;
        continue;
      }
      for (const branchId of anchorBranchIds) {
        const branch = branchesById.get(branchId);
        if (branch) branch.leafCount += 1;
      }
    }
  }

  return [...forest.values()];
}
