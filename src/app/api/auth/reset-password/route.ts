import { jsonError, jsonSuccess } from "@/lib/api/response";
import { hashPassword } from "@/lib/auth/password";
import { hashPasswordResetToken } from "@/lib/auth/password-reset";
import { connectDB } from "@/lib/db/mongoose";
import { resetPasswordSchema } from "@/lib/validations/auth";
import { User } from "@/models/User";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(
        parsed.error.issues[0]?.message ?? "輸入資料無效",
        400,
      );
    }

    const tokenHash = hashPasswordResetToken(parsed.data.token);
    const passwordHash = await hashPassword(parsed.data.password);

    await connectDB();

    const user = await User.findOneAndUpdate(
      {
        passwordResetToken: tokenHash,
        passwordResetExpires: { $gt: new Date() },
      },
      {
        $set: { passwordHash },
        $unset: {
          passwordResetToken: 1,
          passwordResetExpires: 1,
        },
      },
      { runValidators: true },
    );

    if (!user) {
      return jsonError("重設連結無效或已過期", 400);
    }

    return jsonSuccess({ message: "密碼已更新，請使用新密碼登入" });
  } catch (error) {
    console.error("[auth/reset-password]", error);
    return jsonError("無法重設密碼，請稍後再試", 500);
  }
}
