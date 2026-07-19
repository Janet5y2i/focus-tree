import { requireSession } from "@/lib/api/guard";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { buildForestData } from "@/lib/forest/build";

export async function getForest() {
  try {
    const session = await requireSession();
    if (!session) return jsonError("未登入", 401);

    const forest = await buildForestData(session.sub);
    return jsonSuccess({ forest });
  } catch (error) {
    console.error("[forest/GET]", error);
    return jsonError("無法載入森林", 500);
  }
}
