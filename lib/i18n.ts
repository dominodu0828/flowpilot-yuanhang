export type Language = "en" | "zh-CN" | "zh-TW";

export function normalizeLanguage(value: string | undefined | null): Language {
  if (value === "en") return "en";
  if (value === "zh-TW") return "zh-TW";
  return "zh-CN";
}

export function tr(language: Language, zhCN: string, en: string, zhTW = zhCN): string {
  return language === "en" ? en : language === "zh-TW" ? zhTW : zhCN;
}

export function languageFromCookie(value: string | undefined | null): Language {
  return normalizeLanguage(value);
}
