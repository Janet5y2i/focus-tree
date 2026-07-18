import { requireSession } from "@/lib/api/guard";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { toNodeDTO, toTreeDTO } from "@/lib/api/serializers";
import { objectIdSchema, updateNodeSchema } from "@/lib/validations/tree";
import { GoalTree, type IGoalTree } from "@/models/GoalTree";
import { GoalNode } from "@/models/GoalNode";

type Context = { params: Promise<{ treeId: string; nodeId: string }> };

async function refreshFruitCount(tree: IGoalTree, userId: string) {
  tree.stats.fruitCount = await GoalNode.countDocuments({
    treeId: tree._id,
    userId,
    type: "task",
    isCompleted: true,
  });
}

async function loadOwned(
  userId: string,
  treeId: string,
  nodeId: string,
) {
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

export async function PATCH(request: Request, { params }: Context) {
  try {
    const session = await requireSession();
    if (!session) return jsonError("未登入", 401);

    const { treeId, nodeId } = await params;
    const body = await request.json();
    const parsed = updateNodeSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "輸入資料無效", 400);
    }

    const loaded = await loadOwned(session.sub, treeId, nodeId);
    if ("error" in loaded) return loaded.error;
    const { tree, node } = loaded;

    if (parsed.data.title !== undefined) {
      node.title = parsed.data.title;
    }

    if (parsed.data.isCompleted !== undefined) {
      if (node.type !== "task") {
        return jsonError("只有任務可以結出果實", 422);
      }

      node.isCompleted = parsed.data.isCompleted;
      node.completedAt = parsed.data.isCompleted ? new Date() : undefined;
      // 果實數代表目前實際勾選完成的任務數。
      node.fruitEarned = parsed.data.isCompleted;
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

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const session = await requireSession();
    if (!session) return jsonError("未登入", 401);

    const { treeId, nodeId } = await params;
    const loaded = await loadOwned(session.sub, treeId, nodeId);
    if ("error" in loaded) return loaded.error;
    const { tree, node } = loaded;

    let removedTasks = 0;

    if (node.level === 2) {
      // 刪除大樹枝時，底下的任務一併移除
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
