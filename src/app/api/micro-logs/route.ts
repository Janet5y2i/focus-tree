import type { NextRequest } from "next/server";
import { requireSession } from "@/lib/api/guard";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { toMicroLogDTO, toTreeDTO } from "@/lib/api/serializers";
import {
  createMicroLogSchema,
  microLogFilterSchema,
} from "@/lib/validations/micro-log";
import { GoalNode } from "@/models/GoalNode";
import { GoalTree } from "@/models/GoalTree";
import { MicroLog } from "@/models/MicroLog";
import type { MicroLogMood } from "@/lib/types/micro-log";

interface MicroLogQuery {
  userId: string;
  $or?: Array<{ moods: MicroLogMood } | { mood: MicroLogMood }>;
  treeIds?: string;
  "nodeLinks.nodeId"?: string;
  createdAt?: { $gte?: Date; $lte?: Date };
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    if (!session) return jsonError("未登入", 401);

    const parsed = microLogFilterSchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams),
    );
    if (!parsed.success) {
      return jsonError(
        parsed.error.issues[0]?.message ?? "篩選條件無效",
        400,
      );
    }

    const filters = parsed.data;
    const query: MicroLogQuery = { userId: session.sub };
    if (filters.mood) {
      // 同時相容 moods 陣列與舊的單一 mood 欄位。
      query.$or = [{ moods: filters.mood }, { mood: filters.mood }];
    }
    if (filters.treeId) query.treeIds = filters.treeId;
    if (filters.nodeId) query["nodeLinks.nodeId"] = filters.nodeId;
    if (filters.from || filters.to) {
      query.createdAt = {};
      if (filters.from) {
        query.createdAt.$gte = new Date(`${filters.from}T00:00:00.000Z`);
      }
      if (filters.to) {
        query.createdAt.$lte = new Date(`${filters.to}T23:59:59.999Z`);
      }
    }

    const logs = await MicroLog.find(query).sort({ createdAt: -1 }).limit(100);

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

    const moods = [...new Set(parsed.data.moods)];
    const customMood = parsed.data.customMood?.trim() || undefined;

    const log = await MicroLog.create({
      userId: session.sub,
      content: parsed.data.content,
      moods,
      customMood,
      treeIds: ownedTreeIds,
      nodeLinks: ownedNodes.map((node) => ({
        treeId: node.treeId,
        nodeId: node._id,
        nodeLevel: node.level,
        anchorNodeId: node.level === 3 ? node.parentId : undefined,
        // 保留當下名稱快照；未來節點改名或刪除，歷史仍然完整。
        nodeTitle: node.title,
      })),
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
