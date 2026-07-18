import { requireSession } from "@/lib/api/guard";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { toNodeDTO } from "@/lib/api/serializers";
import { objectIdSchema, createNodeSchema } from "@/lib/validations/tree";
import { GoalTree } from "@/models/GoalTree";
import { GoalNode } from "@/models/GoalNode";

type Context = { params: Promise<{ treeId: string }> };

const MAX_BRANCHES_PER_TREE = 8;
const MAX_TASKS_PER_BRANCH = 10;

export async function POST(request: Request, { params }: Context) {
  try {
    const session = await requireSession();
    if (!session) return jsonError("未登入", 401);

    const { treeId } = await params;
    if (!objectIdSchema.safeParse(treeId).success) {
      return jsonError("無效的樹 ID", 400);
    }

    const body = await request.json();
    const parsed = createNodeSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "輸入資料無效", 400);
    }

    const tree = await GoalTree.findOne({ _id: treeId, userId: session.sub });
    if (!tree) return jsonError("找不到這棵樹", 404);

    const { title, parentId } = parsed.data;
    const isBranch = !parentId || parentId === treeId;

    if (isBranch) {
      // Level 2：子目標（大樹枝），父節點是樹幹本身
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
        order: tree.stats.branchCount,
      });

      tree.stats.branchCount += 1;
      await tree.save();

      return jsonSuccess({ node: toNodeDTO(node) }, 201);
    }

    // Level 3：任務（小樹枝）。父節點必須是「同一棵樹、同一使用者」的 Level 2 節點。
    // 這個檢查同時強制了 3 層上限：Level 3 節點不能再當父節點。
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
