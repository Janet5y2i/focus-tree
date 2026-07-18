import { requireSession } from "@/lib/api/guard";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { toMicroLogDTO, toTreeDTO } from "@/lib/api/serializers";
import { createMicroLogSchema } from "@/lib/validations/micro-log";
import { GoalTree } from "@/models/GoalTree";
import { MicroLog } from "@/models/MicroLog";

export async function GET() {
  try {
    const session = await requireSession();
    if (!session) return jsonError("未登入", 401);

    const logs = await MicroLog.find({ userId: session.sub })
      .sort({ loggedAt: -1 })
      .limit(50);

    return jsonSuccess({ logs: logs.map(toMicroLogDTO) });
  } catch (error) {
    console.error("[micro-logs/GET]", error);
    return jsonError("無法載入記錄", 500);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    if (!session) return jsonError("未登入", 401);

    const body = await request.json();
    const parsed = createMicroLogSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(
        parsed.error.issues[0]?.message ?? "輸入資料無效",
        400,
      );
    }

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
    const log = await MicroLog.create({
      userId: session.sub,
      content: parsed.data.content,
      treeIds: ownedTreeIds,
      nodeLinks: [],
      leafEmittedForTreeIds: ownedTreeIds,
    });

    if (ownedTreeIds.length > 0) {
      // 單一 Micro-Log 對每棵關聯樹只增加一片葉子。
      await GoalTree.updateMany(
        { _id: { $in: ownedTreeIds }, userId: session.sub },
        { $inc: { "stats.leafCount": 1 } },
      );
    }

    const updatedTrees = await GoalTree.find({
      _id: { $in: ownedTreeIds },
      userId: session.sub,
    });

    return jsonSuccess(
      {
        log: toMicroLogDTO(log),
        trees: updatedTrees.map(toTreeDTO),
      },
      201,
    );
  } catch (error) {
    console.error("[micro-logs/POST]", error);
    return jsonError("儲存記錄失敗，請稍後再試", 500);
  }
}
