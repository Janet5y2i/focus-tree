import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { hashPassword } from "@/lib/auth/password";
import { createSessionCookie } from "@/lib/auth/session";
import { registerSchema } from "@/lib/validations/auth";
import { User, toSafeUser } from "@/models/User";
import { jsonError, jsonSuccess } from "@/lib/api/response";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "輸入資料無效";
      return jsonError(message, 400);
    }

    const { email, displayName, password } = parsed.data;

    await connectDB();

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return jsonError("此 Email 已被註冊", 409);
    }

    const passwordHash = await hashPassword(password);
    const user = await User.create({
      email: email.toLowerCase(),
      displayName,
      passwordHash,
    });

    const session = { sub: user._id.toString(), email: user.email };
    await createSessionCookie(session);

    return jsonSuccess({ user: toSafeUser(user) }, 201);
  } catch (error) {
    console.error("[auth/register]", error);
    return jsonError("註冊失敗，請稍後再試", 500);
  }
}
