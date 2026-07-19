"use client";

import { useLocale } from "@/i18n/locale-context";
import type { Locale } from "@/i18n/config";

export function LanguageSwitcher({
  className = "",
}: {
  className?: string;
}) {
  const { locale, setLocale, dictionary, isPending } = useLocale();

  const options: { value: Locale; label: string }[] = [
    { value: "zh-TW", label: dictionary.language.zh },
    { value: "en", label: dictionary.language.en },
  ];

  return (
    <label
      className={`inline-flex items-center gap-1.5 text-sm text-forest-700 ${className}`}
    >
      <span className="sr-only">{dictionary.language.label}</span>
      <select
        value={locale}
        disabled={isPending}
        onChange={(event) => setLocale(event.target.value as Locale)}
        className="rounded-full border border-forest-100 bg-white px-2.5 py-1.5 text-xs font-medium text-forest-800 transition-colors hover:bg-forest-50 disabled:opacity-60 sm:text-sm"
        aria-label={dictionary.language.label}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
