"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { localizeApiError } from "@/i18n/api-errors";
import { useLocale } from "@/i18n/locale-context";

type AuthMode = "login" | "register";

interface AuthFormProps {
  mode: AuthMode;
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const { locale, dictionary } = useLocale();
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
        setError(
          localizeApiError(
            data.error,
            locale,
            dictionary.common.somethingWrong,
          ),
        );
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError(dictionary.common.networkError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-5">
      {isRegister && (
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-forest-800">
            {dictionary.auth.displayName}
          </span>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            autoComplete="name"
            required
            maxLength={50}
            className="input-field"
            placeholder={dictionary.auth.displayNamePlaceholder}
          />
        </label>
      )}

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-forest-800">
          {dictionary.auth.email}
        </span>
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
        <span className="text-sm font-medium text-forest-800">
          {dictionary.auth.password}
        </span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={isRegister ? "new-password" : "current-password"}
          required
          minLength={isRegister ? 8 : 1}
          className="input-field"
          placeholder={
            isRegister
              ? dictionary.auth.passwordPlaceholderRegister
              : dictionary.auth.passwordPlaceholderLogin
          }
        />
      </label>

      {!isRegister && (
        <div className="-mt-2 text-right">
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-leaf-700 underline-offset-4 hover:underline"
          >
            {dictionary.auth.forgotPassword}
          </Link>
        </div>
      )}

      {error && (
        <p
          className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700"
          role="alert"
        >
          {error}
        </p>
      )}

      <button type="submit" disabled={loading} className="btn-primary">
        {loading
          ? dictionary.auth.submitting
          : isRegister
            ? dictionary.auth.createAccount
            : dictionary.auth.login}
      </button>

      <p className="text-center text-sm text-forest-600">
        {isRegister ? dictionary.auth.hasAccount : dictionary.auth.noAccount}{" "}
        <Link
          href={isRegister ? "/login" : "/register"}
          className="font-medium text-leaf-700 underline-offset-4 hover:underline"
        >
          {isRegister ? dictionary.auth.login : dictionary.auth.register}
        </Link>
      </p>
    </form>
  );
}
