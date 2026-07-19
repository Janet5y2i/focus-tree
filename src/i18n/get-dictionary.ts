import type { Locale } from "@/i18n/config";
import { en } from "@/i18n/dictionaries/en";
import { zhTW, type Dictionary } from "@/i18n/dictionaries/zh-TW";

const dictionaries: Record<Locale, Dictionary> = {
  "zh-TW": zhTW,
  en,
};

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

export function t(
  template: string,
  vars?: Record<string, string | number>,
): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    vars[key] === undefined ? `{${key}}` : String(vars[key]),
  );
}
