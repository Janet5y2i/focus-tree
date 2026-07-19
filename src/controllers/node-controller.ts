import { requireSession } from "@/lib/api/guard";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { toNodeDTO, toTreeDTO } from "@/lib/api/serializers";
import {
  createNodeSchema,
  objectIdSchema,
  updateNodeSchema,
} from "@/lib/validations/tree";
import { GoalNode } from "@/models/GoalNode";
import { GoalTree, type IGoalTree } from "@/models/GoalTree";

const MAX_BRANCHES_PER_TREE = 8;
const MAX_TASKS_PER_BRANCH = 10;

type TreeContext = { params: Promise<{ treeId: string }> };
type NodeContext = {
  params: Promise<{ treeId: string; nodeId: string }>;
};

async function refreshFruitCount(tree: IGoalTree, userId: string) {
  tree.stats.fruitCount = await GoalNode.countDocuments({
    treeId: tree._id,
    userId,
    type: "task",
    isCompleted: true,
  });
}

async function loadOwned(userId: string, treeId: string, nodeId: string) {
  if (
    !objectIdSchema.safeParse(treeId).success ||
    !objectIdSchema.safeParse(nodeId).success
  ) {
    return { error: jsonError("無效的 ID", 400) } as const;
  }

  const tree = await GoalTree.findOne({ _id: treeId, userId });
  if (!tree) return { error: jsonError("找不到這棵樹", 404) } as const;

  const node = await GoalNode.findOne({ _id: nodeId, treeId, userId });
  if (!node) return { error: jsonError("找不到節點", 404) } as const;

  return { tree, node } as const;
}

export async function createNode(request: Request, { params }: TreeContext) {
  try {
    const session = await requireSession();
    if (!session) return jsonError("未登入", 401);

    const { treeId } = await params;
    if (!objectIdSchema.safeParse(treeId).success) {
      return jsonError("無效的樹 ID", 400);
    }

    const parsed = createNodeSchema.safeParse(await request.json());
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "輸入資料無效", 400);
    }

    const tree = await GoalTree.findOne({ _id: treeId, userId: session.sub });
    if (!tree) return jsonError("找不到這棵樹", 404);

    const { title, parentId, isRecurring } = parsed.data;
    const isBranch = !parentId || parentId === treeId;

    if (isBranch) {
      if (tree.stats.branchCount >= MAX_BRANCHES_PER_TREE) {
        return jsonError(
          `一棵樹最多 ${MAX_BRANCHES_PER_TREE} 根大樹枝，保持專注就好`,
          409,
        );
      }

      const node = await GoalNode.create({
        treeId: tree._id,
        userId: session.sub,
        parentId: tree._id,
        level: 2,
        type: "branch",
        title,
        isRecurring: false,
        order: tree.stats.branchCount,
      });

      tree.stats.branchCount += 1;
      await tree.save();

      return jsonSuccess({ node: toNodeDTO(node) }, 201);
    }

    const parent = await GoalNode.findOne({
      _id: parentId,
      treeId: tree._id,
      userId: session.sub,
    });
    if (!parent) return jsonError("找不到父節點", 404);
    if (parent.level !== 2) {
      return jsonError("目標樹最多三層：任務下不能再新增子項", 422);
    }

    const siblingCount = await GoalNode.countDocuments({
      parentId: parent._id,
      userId: session.sub,
    });
    if (siblingCount >= MAX_TASKS_PER_BRANCH) {
      return jsonError(
        `一根樹枝最多 ${MAX_TASKS_PER_BRANCH} 個任務，先完成一些再繼續吧`,
        409,
      );
    }

    const node = await GoalNode.create({
      treeId: tree._id,
      userId: session.sub,
      parentId: parent._id,
      level: 3,
      type: "task",
      title,
      isRecurring,
      order: siblingCount,
    });

    tree.stats.taskCount += 1;
    await tree.save();

    return jsonSuccess({ node: toNodeDTO(node) }, 201);
  } catch (error) {
    console.error("[trees/:id/nodes/POST]", error);
    return jsonError("新增失敗，請稍後再試", 500);
  }
}

export async function updateNode(request: Request, { params }: NodeContext) {
  try {
    const session = await requireSession();
    if (!session) return jsonError("未登入", 401);

    const { treeId, nodeId } = await params;
    const parsed = updateNodeSchema.safeParse(await request.json());
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "輸入資料無效", 400);
    }

    const loaded = await loadOwned(session.sub, treeId, nodeId);
    if ("error" in loaded) return loaded.error;
    const { tree, node } = loaded;

    if (parsed.data.title !== undefined) node.title = parsed.data.title;
    if (parsed.data.isCompleted !== undefined) {
      if (node.type !== "task") {
        return jsonError("只有任務可以結出果實", 422);
      }
      node.isCompleted = parsed.data.isCompleted;
      node.completedAt = parsed.data.isCompleted ? new Date() : undefined;
      node.fruitEarned = parsed.data.isCompleted;
    }
    if (parsed.data.isRecurring !== undefined) {
      if (node.type !== "task") {
        return jsonError("只有任務可以設為經常性任務", 422);
      }
      node.isRecurring = parsed.data.isRecurring;
    }

    await node.save();
    if (parsed.data.isCompleted !== undefined) {
      await refreshFruitCount(tree, session.sub);
      await tree.save();
    }

    return jsonSuccess({ node: toNodeDTO(node), tree: toTreeDTO(tree) });
  } catch (error) {
    console.error("[nodes/:id/PATCH]", error);
    return jsonError("更新失敗，請稍後再試", 500);
  }
}

export async function deleteNode(_request: Request, { params }: NodeContext) {
  try {
    const session = await requireSession();
    if (!session) return jsonError("未登入", 401);

    const { treeId, nodeId } = await params;
    const loaded = await loadOwned(session.sub, treeId, nodeId);
    if ("error" in loaded) return loaded.error;
    const { tree, node } = loaded;

    let removedTasks = 0;
    if (node.level === 2) {
      const result = await GoalNode.deleteMany({
        parentId: node._id,
        userId: session.sub,
      });
      removedTasks = result.deletedCount ?? 0;
      tree.stats.branchCount = Math.max(0, tree.stats.branchCount - 1);
    } else {
      removedTasks = 1;
    }

    if (node.level === 3) {
      tree.stats.taskCount = Math.max(0, tree.stats.taskCount - 1);
    } else {
      tree.stats.taskCount = Math.max(0, tree.stats.taskCount - removedTasks);
    }

    await node.deleteOne();
    await refreshFruitCount(tree, session.sub);
    await tree.save();

    return jsonSuccess({ deleted: true, tree: toTreeDTO(tree) });
  } catch (error) {
    console.error("[nodes/:id/DELETE]", error);
    return jsonError("刪除失敗，請稍後再試", 500);
  }
}
