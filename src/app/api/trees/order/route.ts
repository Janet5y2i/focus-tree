import { requireSession } from "@/lib/api/guard";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { reorderTreesSchema } from "@/lib/validations/tree";
import { GoalTree } from "@/models/GoalTree";

export async function PUT(request: Request) {
  try {
    const session = await requireSession();
    if (!session) return jsonError("未登入", 401);

    const parsed = reorderTreesSchema.safeParse(await request.json());
    if (!parsed.success) {
      return jsonError(
        parsed.error.issues[0]?.message ?? "排序資料無效",
        400,
      );
    }

    const activeTrees = await GoalTree.find({
      userId: session.sub,
      isCompleted: false,
    }).select("_id");
    const ownedIds = new Set(activeTrees.map((tree) => tree._id.toString()));

    // 必須一次提交目前全部進行中的樹，避免漏掉或跨使用者調整順序。
    if (
      parsed.data.treeIds.length !== ownedIds.size ||
      parsed.data.treeIds.some((id) => !ownedIds.has(id))
    ) {
      return jsonError("排序內容與目前進行中的目標樹不一致", 409);
    }

    await GoalTree.bulkWrite(
      parsed.data.treeIds.map((treeId, index) => ({
        updateOne: {
          filter: { _id: treeId, userId: session.sub, isCompleted: false },
          update: { $set: { manualOrder: index } },
        },
      })),
    );

    return jsonSuccess({ reordered: true });
  } catch (error) {
    console.error("[trees/order/PUT]", error);
    return jsonError("儲存排序失敗，請稍後再試", 500);
  }
}
