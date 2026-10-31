/** Supported place / catalog languages (Warsaw product). */
export const LANGS = ["pl", "en", "uk", "ru", "be"] as const;

export type Lang = (typeof LANGS)[number];

export const LANG_LABELS: Record<Lang, string> = {
  pl: "Polish",
  en: "English",
  uk: "Ukrainian",
  ru: "Russian",
  be: "Belarusian",
};

/** Prefer Polish, then English, then the rest for display fallback. */
export const NAME_ORDER: Lang[] = ["pl", "en", "uk", "ru", "be"];

export function isLang(value: string): value is Lang {
  return (LANGS as readonly string[]).includes(value);
}
