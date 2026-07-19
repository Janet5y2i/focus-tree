"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
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

export default function ForgotPasswordPage() {
  const { dictionary, locale } = useLocale();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
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

      setSubmitted(true);
    } catch {
      setError(dictionary.common.networkError);
    } finally {
      setLoading(false);
    }
  }

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
            {dictionary.auth.forgotPasswordTagline}
          </p>
        </div>

        <div className="card-surface p-6 sm:p-8">
          <h1 className="mb-6 text-xl font-semibold text-forest-900">
            {dictionary.auth.forgotPasswordTitle}
          </h1>

          {submitted ? (
            <div className="flex flex-col gap-5">
              <p
                className="rounded-xl bg-leaf-50 px-4 py-3 text-sm leading-relaxed text-leaf-800"
                role="status"
              >
                {dictionary.auth.resetRequestSuccess}
              </p>
              <Link href="/login" className="btn-primary text-center">
                {dictionary.auth.backToLogin}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-forest-800">
                  {dictionary.auth.email}
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                  className="input-field"
                  placeholder="you@example.com"
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
                disabled={loading}
                className="btn-primary"
              >
                {loading
                  ? dictionary.auth.sendingResetLink
                  : dictionary.auth.sendResetLink}
              </button>

              <Link
                href="/login"
                className="text-center text-sm font-medium text-leaf-700 underline-offset-4 hover:underline"
              >
                {dictionary.auth.backToLogin}
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
