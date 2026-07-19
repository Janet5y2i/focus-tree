import { requireSession } from "@/lib/api/guard";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { toNodeDTO, toTreeDTO } from "@/lib/api/serializers";
import {
  createTreeSchema,
  objectIdSchema,
  reorderTreesSchema,
  updateTreeSchema,
} from "@/lib/validations/tree";
import { GoalNode } from "@/models/GoalNode";
import { GoalTree } from "@/models/GoalTree";

const MAX_TREES_PER_USER = 12;

type TreeContext = { params: Promise<{ treeId: string }> };

export async function listTrees() {
  try {
    const session = await requireSession();
    if (!session) return jsonError("未登入", 401);

    const trees = await GoalTree.find({ userId: session.sub }).sort({
      createdAt: -1,
    });

    return jsonSuccess({ trees: trees.map(toTreeDTO) });
  } catch (error) {
    console.error("[trees/GET]", error);
    return jsonError("無法載入目標樹", 500);
  }
}

export async function createTree(request: Request) {
  try {
    const session = await requireSession();
    if (!session) return jsonError("未登入", 401);

    const parsed = createTreeSchema.safeParse(await request.json());
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "輸入資料無效", 400);
    }

    const treeCount = await GoalTree.countDocuments({ userId: session.sub });
    if (treeCount >= MAX_TREES_PER_USER) {
      return jsonError(
        `一次專注照顧 ${MAX_TREES_PER_USER} 棵樹就很足夠了，先讓現有的樹成長吧`,
        409,
      );
    }

    const firstManuallyOrdered = await GoalTree.findOne({
      userId: session.sub,
      isCompleted: false,
      manualOrder: { $exists: true },
    }).sort({ manualOrder: 1 });

    const tree = await GoalTree.create({
      userId: session.sub,
      title: parsed.data.title,
      description: parsed.data.description,
      manualOrder:
        firstManuallyOrdered?.manualOrder !== undefined
          ? firstManuallyOrdered.manualOrder - 1
          : undefined,
    });

    return jsonSuccess({ tree: toTreeDTO(tree) }, 201);
  } catch (error) {
    console.error("[trees/POST]", error);
    return jsonError("種樹失敗，請稍後再試", 500);
  }
}

export async function getTree(_request: Request, { params }: TreeContext) {
  try {
    const session = await requireSession();
    if (!session) return jsonError("未登入", 401);

    const { treeId } = await params;
    if (!objectIdSchema.safeParse(treeId).success) {
      return jsonError("無效的樹 ID", 400);
    }

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

export async function updateTree(request: Request, { params }: TreeContext) {
  try {
    const session = await requireSession();
    if (!session) return jsonError("未登入", 401);

    const { treeId } = await params;
    if (!objectIdSchema.safeParse(treeId).success) {
      return jsonError("無效的樹 ID", 400);
    }

    const parsed = updateTreeSchema.safeParse(await request.json());
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
      if (!parsed.data.isCompleted) {
        const firstManuallyOrdered = await GoalTree.findOne({
          _id: { $ne: tree._id },
          userId: session.sub,
          isCompleted: false,
          manualOrder: { $exists: true },
        }).sort({ manualOrder: 1 });
        if (firstManuallyOrdered?.manualOrder !== undefined) {
          tree.manualOrder = firstManuallyOrdered.manualOrder - 1;
        }
      }
    }
    await tree.save();

    return jsonSuccess({ tree: toTreeDTO(tree) });
  } catch (error) {
    console.error("[trees/:id/PATCH]", error);
    return jsonError("更新失敗，請稍後再試", 500);
  }
}

export async function deleteTree(_request: Request, { params }: TreeContext) {
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

    await GoalNode.deleteMany({ treeId: tree._id, userId: session.sub });

    return jsonSuccess({ deleted: true });
  } catch (error) {
    console.error("[trees/:id/DELETE]", error);
    return jsonError("刪除失敗，請稍後再試", 500);
  }
}

export async function reorderTrees(request: Request) {
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
