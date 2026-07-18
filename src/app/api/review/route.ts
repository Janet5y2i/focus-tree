import type { NextRequest } from "next/server";
import { requireSession } from "@/lib/api/guard";
import { jsonError, jsonSuccess } from "@/lib/api/response";
import { buildReviewStats } from "@/lib/review/aggregate";
import { generateReviewSummary } from "@/lib/ai/review";
import { reviewQuerySchema } from "@/lib/validations/review";
import { User } from "@/models/User";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    if (!session) return jsonError("未登入", 401);

    const user = await User.findById(session.sub);
    if (!user) return jsonError("使用者不存在", 401);

    const parsed = reviewQuerySchema.safeParse({
      period:
        request.nextUrl.searchParams.get("period") ??
        user.preferences.reviewCadence,
      from: request.nextUrl.searchParams.get("from") ?? undefined,
      to: request.nextUrl.searchParams.get("to") ?? undefined,
    });
    if (!parsed.success) {
      return jsonError(
        parsed.error.issues[0]?.message ?? "回顧時間範圍無效",
        400,
      );
    }
    const { period, from, to } = parsed.data;

    const stats = await buildReviewStats(
      session.sub,
      period,
      period === "custom" && from && to ? { from, to } : undefined,
    );
    const { summary, generatedBy } = await generateReviewSummary(
      user.displayName,
      period,
      stats,
    );

    return jsonSuccess({ period, stats, summary, generatedBy });
  } catch (error) {
    console.error("[review/GET]", error);
    return jsonError("無法生成回顧，請稍後再試", 500);
  }
}
