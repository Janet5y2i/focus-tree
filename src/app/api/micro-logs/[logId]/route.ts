import { requireSession } from "@/lib/api/guard";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { toMicroLogDTO, toTreeDTO } from "@/lib/api/serializers";
import { objectIdSchema } from "@/lib/validations/tree";
import { updateMicroLogSchema } from "@/lib/validations/micro-log";
import { GoalNode } from "@/models/GoalNode";
import { GoalTree } from "@/models/GoalTree";
import { MicroLog } from "@/models/MicroLog";

type Context = { params: Promise<{ logId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  try {
    const session = await requireSession();
    if (!session) return jsonError("未登入", 401);

    const { logId } = await params;
    if (!objectIdSchema.safeParse(logId).success) {
      return jsonError("無效的記錄 ID", 400);
    }

    const body = await request.json();
    const parsed = updateMicroLogSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(
        parsed.error.issues[0]?.message ?? "輸入資料無效",
        400,
      );
    }

    const log = await MicroLog.findOne({ _id: logId, userId: session.sub });
    if (!log) return jsonError("找不到這筆記錄", 404);

    // 去重後再驗證擁有權，避免同一筆記錄讓同一棵樹重複長葉。
    const treeIds = [...new Set(parsed.data.treeIds)];
    const ownedTrees = await GoalTree.find({
      _id: { $in: treeIds },
      userId: session.sub,
    });

    // 不透露哪些 ID 存在或屬於別人，避免跨租戶資源探測。
    if (ownedTrees.length !== treeIds.length) {
      return jsonError("有些目標樹不存在或無法存取", 400);
    }

    const ownedTreeIds = ownedTrees.map((tree) => tree._id);
    const nodeIds = [...new Set(parsed.data.nodeIds)];
    const ownedNodes = await GoalNode.find({
      _id: { $in: nodeIds },
      treeId: { $in: ownedTreeIds },
      userId: session.sub,
    });

    // 節點必須同時屬於目前使用者，且位於這次勾選的目標樹中。
    if (ownedNodes.length !== nodeIds.length) {
      return jsonError("有些子目標或任務不存在，或不屬於所選目標樹", 400);
    }

    const previousTreeIdSet = new Set(
      log.leafEmittedForTreeIds.map((id) => id.toString()),
    );
    const nextTreeIdSet = new Set(ownedTreeIds.map((id) => id.toString()));
    const addedTreeIds = ownedTreeIds.filter(
      (id) => !previousTreeIdSet.has(id.toString()),
    );
    const removedTreeIds = log.leafEmittedForTreeIds.filter(
      (id) => !nextTreeIdSet.has(id.toString()),
    );

    log.content = parsed.data.content;
    log.mood = parsed.data.mood;
    log.treeIds = ownedTreeIds;
    log.nodeLinks = ownedNodes.map((node) => ({
      treeId: node.treeId,
      nodeId: node._id,
      nodeLevel: node.level,
      anchorNodeId: node.level === 3 ? node.parentId : undefined,
      // 重新建立快照，讓編輯後的歷史也反映當下選到的節點名稱。
      nodeTitle: node.title,
    }));
    log.leafEmittedForTreeIds = ownedTreeIds;
    await log.save();

    if (addedTreeIds.length > 0) {
      await GoalTree.updateMany(
        { _id: { $in: addedTreeIds }, userId: session.sub },
        { $inc: { "stats.leafCount": 1 } },
      );
    }

    if (removedTreeIds.length > 0) {
      await GoalTree.updateMany(
        { _id: { $in: removedTreeIds }, userId: session.sub },
        { $inc: { "stats.leafCount": -1 } },
      );
      // 避免葉子數因歷史資料漂移落到負數。
      await GoalTree.updateMany(
        {
          _id: { $in: removedTreeIds },
          userId: session.sub,
          "stats.leafCount": { $lt: 0 },
        },
        { $set: { "stats.leafCount": 0 } },
      );
    }

    const affectedIds = [
      ...addedTreeIds.map((id) => id.toString()),
      ...removedTreeIds.map((id) => id.toString()),
    ];
    const updatedTrees =
      affectedIds.length > 0
        ? await GoalTree.find({
            _id: { $in: affectedIds },
            userId: session.sub,
          })
        : [];

    return jsonSuccess({
      log: toMicroLogDTO(log),
      trees: updatedTrees.map(toTreeDTO),
    });
  } catch (error) {
    console.error("[micro-logs/:id/PATCH]", error);
    return jsonError("更新記錄失敗，請稍後再試", 500);
  }
}
