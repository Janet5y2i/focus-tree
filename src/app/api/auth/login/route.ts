import { connectDB } from "@/lib/db/mongoose";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionCookie } from "@/lib/auth/session";
import { loginSchema } from "@/lib/validations/auth";
import { User, toSafeUser } from "@/models/User";
import { jsonError, jsonSuccess } from "@/lib/api/response";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "輸入資料無效";
      return jsonError(message, 400);
    }

    const { email, password } = parsed.data;

    await connectDB();

    const user = await User.findOne({ email: email.toLowerCase() }).select(
      "+passwordHash",
    );

    if (!user) {
      return jsonError("Email 或密碼錯誤", 401);
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return jsonError("Email 或密碼錯誤", 401);
    }

    await createSessionCookie({
      sub: user._id.toString(),
      email: user.email,
    });

    return jsonSuccess({ user: toSafeUser(user) });
  } catch (error) {
    console.error("[auth/login]", error);
    return jsonError("登入失敗，請稍後再試", 500);
  }
}
