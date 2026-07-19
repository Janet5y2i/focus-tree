import { jsonError, jsonSuccess } from "@/lib/api/response";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  createPasswordResetToken,
  hashPasswordResetToken,
  PASSWORD_RESET_TTL_MS,
} from "@/lib/auth/password-reset";
import {
  clearSessionCookie,
  createSessionCookie,
  getSession,
} from "@/lib/auth/session";
import { connectDB } from "@/lib/db/mongoose";
import { sendPasswordResetEmail } from "@/lib/email/password-reset";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "@/lib/validations/auth";
import { User, toSafeUser } from "@/models/User";

const GENERIC_RESET_MESSAGE = "若此帳號存在，重設信件已寄出";

function getResetUrl(request: Request, token: string): string {
  const configuredBaseUrl = process.env.PASSWORD_RESET_BASE_URL;
  const baseUrl = configuredBaseUrl ?? new URL(request.url).origin;
  const resetUrl = new URL("/reset-password", baseUrl);
  resetUrl.searchParams.set("token", token);
  return resetUrl.toString();
}

export async function login(request: Request) {
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
    if (!user) return jsonError("Email 或密碼錯誤", 401);

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) return jsonError("Email 或密碼錯誤", 401);

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

export async function register(request: Request) {
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
    if (existing) return jsonError("此 Email 已被註冊", 409);

    const passwordHash = await hashPassword(password);
    const user = await User.create({
      email: email.toLowerCase(),
      displayName,
      passwordHash,
    });

    await createSessionCookie({
      sub: user._id.toString(),
      email: user.email,
    });

    return jsonSuccess({ user: toSafeUser(user) }, 201);
  } catch (error) {
    console.error("[auth/register]", error);
    return jsonError("註冊失敗，請稍後再試", 500);
  }
}

export async function logout() {
  await clearSessionCookie();
  return jsonSuccess({ ok: true });
}

export async function getCurrentUser() {
  try {
    const session = await getSession();
    if (!session) return jsonError("未登入", 401);

    await connectDB();
    const user = await User.findById(session.sub);
    if (!user) return jsonError("使用者不存在", 401);

    return jsonSuccess({ user: toSafeUser(user) });
  } catch (error) {
    console.error("[auth/me]", error);
    return jsonError("無法取得使用者資訊", 500);
  }
}

export async function forgotPassword(request: Request) {
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

    return jsonSuccess({ message: GENERIC_RESET_MESSAGE });
  } catch (error) {
    console.error("[auth/forgot-password]", error);
    return jsonError("無法處理重設密碼申請，請稍後再試", 500);
  }
}

export async function resetPassword(request: Request) {
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

    if (!user) return jsonError("重設連結無效或已過期", 400);

    return jsonSuccess({ message: "密碼已更新，請使用新密碼登入" });
  } catch (error) {
    console.error("[auth/reset-password]", error);
    return jsonError("無法重設密碼，請稍後再試", 500);
  }
}
