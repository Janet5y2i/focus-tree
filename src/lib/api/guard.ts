import { connectDB } from "@/lib/db/mongoose";
import { getSession } from "@/lib/auth/session";
import type { SessionPayload } from "@/lib/auth/jwt";

/**
 * 受保護 API 的共用前置：驗證 session 並連線 DB。
 * 回傳 null 表示未登入，呼叫端應回 401。
 */
export async function requireSession(): Promise<SessionPayload | null> {
  const session = await getSession();
  if (!session) return null;
  await connectDB();
  return session;
}
