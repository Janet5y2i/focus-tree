import { jsonError, jsonSuccess } from "@/lib/api/response";
import {
  createPasswordResetToken,
  hashPasswordResetToken,
  PASSWORD_RESET_TTL_MS,
} from "@/lib/auth/password-reset";
import { connectDB } from "@/lib/db/mongoose";
import { sendPasswordResetEmail } from "@/lib/email/password-reset";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { User } from "@/models/User";

const GENERIC_MESSAGE = "若此帳號存在，重設信件已寄出";

function getResetUrl(request: Request, token: string): string {
  const configuredBaseUrl = process.env.PASSWORD_RESET_BASE_URL;
  const baseUrl = configuredBaseUrl ?? new URL(request.url).origin;
  const resetUrl = new URL("/reset-password", baseUrl);
  resetUrl.searchParams.set("token", token);
  return resetUrl.toString();
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const parsed = forgotPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(
        parsed.error.issues[0]?.message ?? "輸入資料無效",
        400,
      );
    }

    const token = createPasswordResetToken();
    const tokenHash = hashPasswordResetToken(token);
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

    await connectDB();

    const user = await User.findOneAndUpdate(
      { email: parsed.data.email.toLowerCase() },
      {
        $set: {
          passwordResetToken: tokenHash,
          passwordResetExpires: expiresAt,
        },
      },
      { new: true },
    );

    if (user) {
      try {
        await sendPasswordResetEmail({
          to: user.email,
          resetUrl: getResetUrl(request, token),
        });
      } catch (error) {
        console.error("[auth/forgot-password/email]", error);
        await User.updateOne(
          { _id: user._id, passwordResetToken: tokenHash },
          {
            $unset: {
              passwordResetToken: 1,
              passwordResetExpires: 1,
            },
          },
        );
      }
    }

    return jsonSuccess({ message: GENERIC_MESSAGE });
  } catch (error) {
    console.error("[auth/forgot-password]", error);
    return jsonError("無法處理重設密碼申請，請稍後再試", 500);
  }
}
