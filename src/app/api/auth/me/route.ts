import { connectDB } from "@/lib/db/mongoose";
import { getSession } from "@/lib/auth/session";
import { User, toSafeUser } from "@/models/User";
import { jsonError, jsonSuccess } from "@/lib/api/response";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return jsonError("未登入", 401);
    }

    await connectDB();

    const user = await User.findById(session.sub);
    if (!user) {
      return jsonError("使用者不存在", 401);
    }

    return jsonSuccess({ user: toSafeUser(user) });
  } catch (error) {
    console.error("[auth/me]", error);
    return jsonError("無法取得使用者資訊", 500);
  }
}
