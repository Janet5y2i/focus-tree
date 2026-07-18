import { clearSessionCookie } from "@/lib/auth/session";
import { jsonSuccess } from "@/lib/api/response";

export async function POST() {
  await clearSessionCookie();
  return jsonSuccess({ ok: true });
}
