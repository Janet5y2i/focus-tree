import { requireSession } from "@/lib/api/guard";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { toTreeDTO, toNodeDTO } from "@/lib/api/serializers";
import { objectIdSchema, updateTreeSchema } from "@/lib/validations/tree";
import { GoalTree } from "@/models/GoalTree";
import { GoalNode } from "@/models/GoalNode";

type Context = { params: Promise<{ treeId: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const session = await requireSession();
    if (!session) return jsonError("未登入", 401);

    const { treeId } = await params;
    if (!objectIdSchema.safeParse(treeId).success) {
      return jsonError("無效的樹 ID", 400);
    }

    // 一律以 userId 過濾，避免跨使用者存取（IDOR）
    const tree = await GoalTree.findOne({ _id: treeId, userId: session.sub });
    if (!tree) return jsonError("找不到這棵樹", 404);

    const nodes = await GoalNode.find({
      treeId: tree._id,
      userId: session.sub,
    }).sort({ level: 1, order: 1 });

    return jsonSuccess({
      tree: toTreeDTO(tree),
      nodes: nodes.map(toNodeDTO),
    });
  } catch (error) {
    console.error("[trees/:id/GET]", error);
    return jsonError("無法載入這棵樹", 500);
  }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const session = await requireSession();
    if (!session) return jsonError("未登入", 401);

    const { treeId } = await params;
    if (!objectIdSchema.safeParse(treeId).success) {
      return jsonError("無效的樹 ID", 400);
    }

    const body = await request.json();
    const parsed = updateTreeSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "輸入資料無效", 400);
    }

    const tree = await GoalTree.findOne({ _id: treeId, userId: session.sub });
    if (!tree) return jsonError("找不到這棵樹", 404);

    if (parsed.data.title !== undefined) tree.title = parsed.data.title;
    if (parsed.data.description !== undefined) {
      tree.description = parsed.data.description;
    }
    if (parsed.data.status !== undefined) tree.status = parsed.data.status;
    if (parsed.data.isCompleted !== undefined) {
      tree.isCompleted = parsed.data.isCompleted;
      tree.completedAt = parsed.data.isCompleted ? new Date() : undefined;
    }
    await tree.save();

    return jsonSuccess({ tree: toTreeDTO(tree) });
  } catch (error) {
    console.error("[trees/:id/PATCH]", error);
    return jsonError("更新失敗，請稍後再試", 500);
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    const session = await requireSession();
    if (!session) return jsonError("未登入", 401);

    const { treeId } = await params;
    if (!objectIdSchema.safeParse(treeId).success) {
      return jsonError("無效的樹 ID", 400);
    }

    const tree = await GoalTree.findOneAndDelete({
      _id: treeId,
      userId: session.sub,
    });
    if (!tree) return jsonError("找不到這棵樹", 404);

    // 級聯刪除所有節點（Micro-Log 保留：微小實踐是使用者的歷史，不隨樹消失）
    await GoalNode.deleteMany({ treeId: tree._id, userId: session.sub });

    return jsonSuccess({ deleted: true });
  } catch (error) {
    console.error("[trees/:id/DELETE]", error);
    return jsonError("刪除失敗，請稍後再試", 500);
  }
}
