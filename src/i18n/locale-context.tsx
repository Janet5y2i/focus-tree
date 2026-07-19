"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  LOCALE_COOKIE,
  localeHtmlLang,
  type Locale,
} from "@/i18n/config";
import { getDictionary, t as interpolate } from "@/i18n/get-dictionary";
import type { Dictionary } from "@/i18n/dictionaries/zh-TW";

interface LocaleContextValue {
  locale: Locale;
  dictionary: Dictionary;
  setLocale: (locale: Locale) => void;
  t: (template: string, vars?: Record<string, string | number>) => string;
  isPending: boolean;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

function writeLocaleCookie(locale: Locale) {
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${LOCALE_COOKIE}=${locale};path=/;max-age=${maxAge};samesite=lax`;
}

export function LocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: ReactNode;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    document.documentElement.lang = localeHtmlLang(locale);
  }, [locale]);

  const setLocale = useCallback(
    (next: Locale) => {
      if (next === locale) return;
      writeLocaleCookie(next);
      document.documentElement.lang = localeHtmlLang(next);
      setLocaleState(next);
      startTransition(() => {
        router.refresh();
      });
    },
    [locale, router],
  );

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      dictionary: getDictionary(locale),
      setLocale,
      t: interpolate,
      isPending,
    }),
    [locale, setLocale, isPending],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return context;
}
