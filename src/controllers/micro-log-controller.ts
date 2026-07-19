import type { NextRequest } from "next/server";
import { requireSession } from "@/lib/api/guard";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { toMicroLogDTO, toTreeDTO } from "@/lib/api/serializers";
import type { MicroLogMood } from "@/lib/types/micro-log";
import {
  createMicroLogSchema,
  microLogFilterSchema,
  updateMicroLogSchema,
} from "@/lib/validations/micro-log";
import { objectIdSchema } from "@/lib/validations/tree";
import { GoalNode } from "@/models/GoalNode";
import { GoalTree } from "@/models/GoalTree";
import { MicroLog } from "@/models/MicroLog";

interface MicroLogQuery {
  userId: string;
  $or?: Array<{ moods: MicroLogMood } | { mood: MicroLogMood }>;
  treeIds?: string;
  "nodeLinks.nodeId"?: string;
  createdAt?: { $gte?: Date; $lte?: Date };
}

type LogContext = { params: Promise<{ logId: string }> };

async function loadOwnedLinks(
  userId: string,
  treeIdsInput: string[],
  nodeIdsInput: string[],
) {
  const treeIds = [...new Set(treeIdsInput)];
  const ownedTrees = await GoalTree.find({
    _id: { $in: treeIds },
    userId,
  });

  if (ownedTrees.length !== treeIds.length) {
    return {
      error: jsonError("有些目標樹不存在或無法存取", 400),
    } as const;
  }

  const ownedTreeIds = ownedTrees.map((tree) => tree._id);
  const nodeIds = [...new Set(nodeIdsInput)];
  const ownedNodes = await GoalNode.find({
    _id: { $in: nodeIds },
    treeId: { $in: ownedTreeIds },
    userId,
  });

  if (ownedNodes.length !== nodeIds.length) {
    return {
      error: jsonError("有些子目標或任務不存在，或不屬於所選目標樹", 400),
    } as const;
  }

  return { ownedTreeIds, ownedNodes } as const;
}

export async function listMicroLogs(request: NextRequest) {
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

export async function createMicroLog(request: Request) {
  try {
    const session = await requireSession();
    if (!session) return jsonError("未登入", 401);

    const parsed = createMicroLogSchema.safeParse(await request.json());
    if (!parsed.success) {
      return jsonError(
        parsed.error.issues[0]?.message ?? "輸入資料無效",
        400,
      );
    }

    const owned = await loadOwnedLinks(
      session.sub,
      parsed.data.treeIds,
      parsed.data.nodeIds,
    );
    if ("error" in owned) return owned.error;

    const { ownedTreeIds, ownedNodes } = owned;
    const log = await MicroLog.create({
      userId: session.sub,
      content: parsed.data.content,
      moods: [...new Set(parsed.data.moods)],
      customMood: parsed.data.customMood?.trim() || undefined,
      treeIds: ownedTreeIds,
      nodeLinks: ownedNodes.map((node) => ({
        treeId: node.treeId,
        nodeId: node._id,
        nodeLevel: node.level,
        anchorNodeId: node.level === 3 ? node.parentId : undefined,
        nodeTitle: node.title,
      })),
      leafEmittedForTreeIds: ownedTreeIds,
    });

    if (ownedTreeIds.length > 0) {
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

export async function updateMicroLog(
  request: Request,
  { params }: LogContext,
) {
  try {
    const session = await requireSession();
    if (!session) return jsonError("未登入", 401);

    const { logId } = await params;
    if (!objectIdSchema.safeParse(logId).success) {
      return jsonError("無效的記錄 ID", 400);
    }

    const parsed = updateMicroLogSchema.safeParse(await request.json());
    if (!parsed.success) {
      return jsonError(
        parsed.error.issues[0]?.message ?? "輸入資料無效",
        400,
      );
    }

    const log = await MicroLog.findOne({ _id: logId, userId: session.sub });
    if (!log) return jsonError("找不到這筆記錄", 404);

    const owned = await loadOwnedLinks(
      session.sub,
      parsed.data.treeIds,
      parsed.data.nodeIds,
    );
    if ("error" in owned) return owned.error;

    const { ownedTreeIds, ownedNodes } = owned;
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
    log.moods = [...new Set(parsed.data.moods)];
    log.customMood = parsed.data.customMood?.trim() || "";
    log.set("mood", undefined);
    log.treeIds = ownedTreeIds;
    log.nodeLinks = ownedNodes.map((node) => ({
      treeId: node.treeId,
      nodeId: node._id,
      nodeLevel: node.level,
      anchorNodeId: node.level === 3 ? node.parentId : undefined,
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
