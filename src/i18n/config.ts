export const locales = ["zh-TW", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "zh-TW";
export const LOCALE_COOKIE = "ft_locale";

export function isLocale(value: unknown): value is Locale {
  return value === "zh-TW" || value === "en";
}

export function localeHtmlLang(locale: Locale): string {
  return locale === "en" ? "en" : "zh-TW";
}
