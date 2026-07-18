"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type AuthMode = "login" | "register";

interface AuthFormProps {
  mode: AuthMode;
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isRegister = mode === "register";

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";
      const payload = isRegister
        ? { email, displayName, password }
        : { email, password };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "發生錯誤，請稍後再試");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("網路連線失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-5">
      {isRegister && (
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-forest-800">顯示名稱</span>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            autoComplete="name"
            required
            maxLength={50}
            className="input-field"
            placeholder="你希望被怎麼稱呼？"
          />
        </label>
      )}

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-forest-800">Email</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
          className="input-field"
          placeholder="you@example.com"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-forest-800">密碼</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={isRegister ? "new-password" : "current-password"}
          required
          minLength={isRegister ? 8 : 1}
          className="input-field"
          placeholder={isRegister ? "至少 8 字，含英文與數字" : "你的密碼"}
        />
      </label>

      {error && (
        <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
          {error}
        </p>
      )}

      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? "處理中…" : isRegister ? "建立帳號" : "登入"}
      </button>

      <p className="text-center text-sm text-forest-600">
        {isRegister ? "已有帳號？" : "還沒有帳號？"}{" "}
        <Link
          href={isRegister ? "/login" : "/register"}
          className="font-medium text-leaf-700 underline-offset-4 hover:underline"
        >
          {isRegister ? "登入" : "註冊"}
        </Link>
      </p>
    </form>
  );
}
