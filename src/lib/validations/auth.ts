import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "密碼至少 8 個字元")
  .max(128, "密碼最多 128 個字元")
  .regex(/[A-Za-z]/, "密碼需包含至少一個英文字母")
  .regex(/[0-9]/, "密碼需包含至少一個數字");

export const registerSchema = z.object({
  email: z.string().email("請輸入有效的 Email"),
  displayName: z
    .string()
    .trim()
    .min(1, "請輸入顯示名稱")
    .max(50, "顯示名稱最多 50 字"),
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: z.string().email("請輸入有效的 Email"),
  password: z.string().min(1, "請輸入密碼"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("請輸入有效的 Email"),
});

export const resetPasswordSchema = z.object({
  token: z
    .string()
    .regex(/^[a-f0-9]{64}$/i, "重設連結無效或已過期"),
  password: passwordSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
