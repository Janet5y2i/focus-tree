"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import { localizeApiError } from "@/i18n/api-errors";
import { useLocale } from "@/i18n/locale-context";

function getApiError(data: unknown): string | undefined {
  if (
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    typeof data.error === "string"
  ) {
    return data.error;
  }
  return undefined;
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const { dictionary, locale } = useLocale();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!token) {
      setError(dictionary.auth.invalidResetLink);
      return;
    }

    if (password !== confirmation) {
      setError(dictionary.auth.passwordMismatch);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data: unknown = await response.json();

      if (!response.ok) {
        setError(
          localizeApiError(
            getApiError(data),
            locale,
            dictionary.common.somethingWrong,
          ),
        );
        return;
      }

      setCompleted(true);
      setPassword("");
      setConfirmation("");
    } catch {
      setError(dictionary.common.networkError);
    } finally {
      setLoading(false);
    }
  }

  if (completed) {
    return (
      <div className="flex flex-col gap-5">
        <p
          className="rounded-xl bg-leaf-50 px-4 py-3 text-sm leading-relaxed text-leaf-800"
          role="status"
        >
          {dictionary.auth.resetPasswordSuccess}
        </p>
        <Link href="/login" className="btn-primary text-center">
          {dictionary.auth.login}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {!token && (
        <p
          className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700"
          role="alert"
        >
          {dictionary.auth.invalidResetLink}
        </p>
      )}

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-forest-800">
          {dictionary.auth.newPassword}
        </span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={128}
          disabled={!token}
          className="input-field"
          placeholder={dictionary.auth.passwordPlaceholderRegister}
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-forest-800">
          {dictionary.auth.confirmPassword}
        </span>
        <input
          type="password"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={128}
          disabled={!token}
          className="input-field"
          placeholder={dictionary.auth.confirmPassword}
        />
      </label>

      {error && (
        <p
          className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700"
          role="alert"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || !token}
        className="btn-primary"
      >
        {loading
          ? dictionary.auth.resettingPassword
          : dictionary.auth.resetPassword}
      </button>

      <Link
        href="/login"
        className="text-center text-sm font-medium text-leaf-700 underline-offset-4 hover:underline"
      >
        {dictionary.auth.backToLogin}
      </Link>
    </form>
  );
}

export default function ResetPasswordPage() {
  const { dictionary } = useLocale();

  return (
    <div className="relative flex min-h-full flex-col items-center justify-center bg-surface-muted px-4 py-10">
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="text-3xl" aria-hidden>
              🌳
            </span>
            <span className="text-2xl font-semibold text-forest-900">
              Focus Tree
            </span>
          </Link>
          <p className="mt-3 text-sm leading-relaxed text-forest-600">
            {dictionary.auth.resetPasswordTagline}
          </p>
        </div>

        <div className="card-surface p-6 sm:p-8">
          <h1 className="mb-6 text-xl font-semibold text-forest-900">
            {dictionary.auth.resetPasswordTitle}
          </h1>
          <Suspense
            fallback={
              <p className="text-sm text-forest-600">
                {dictionary.common.loadingEllipsis}
              </p>
            }
          >
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
