"use client";

import Link from "next/link";
import { AuthForm } from "@/components/auth/AuthForm";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import { useLocale } from "@/i18n/locale-context";

export function LoginPageClient() {
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
            {dictionary.auth.loginTagline}
          </p>
        </div>

        <div className="card-surface p-6 sm:p-8">
          <h1 className="mb-6 text-xl font-semibold text-forest-900">
            {dictionary.auth.loginTitle}
          </h1>
          <AuthForm mode="login" />
        </div>
      </div>
    </div>
  );
}
