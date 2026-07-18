import { requireSession } from "@/lib/api/guard";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { toTreeDTO } from "@/lib/api/serializers";
import { createTreeSchema } from "@/lib/validations/tree";
import { GoalTree } from "@/models/GoalTree";

const MAX_TREES_PER_USER = 12;

export async function GET() {
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

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    if (!session) return jsonError("未登入", 401);

    const body = await request.json();
    const parsed = createTreeSchema.safeParse(body);
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

    const tree = await GoalTree.create({
      userId: session.sub,
      title: parsed.data.title,
      description: parsed.data.description,
    });

    return jsonSuccess({ tree: toTreeDTO(tree) }, 201);
  } catch (error) {
    console.error("[trees/POST]", error);
    return jsonError("種樹失敗，請稍後再試", 500);
  }
}
