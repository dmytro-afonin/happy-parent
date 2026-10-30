import { v } from "convex/values";
import { LANGS, NAME_ORDER, type Lang } from "./langs";

export const copyFieldsValidator = v.object({
  name: v.string(),
  description: v.string(),
  address: v.string(),
});

export const placeCopyValidator = v.object({
  pl: copyFieldsValidator,
  en: copyFieldsValidator,
  uk: copyFieldsValidator,
  ru: copyFieldsValidator,
  be: copyFieldsValidator,
});

export const langNamesValidator = v.object({
  pl: v.string(),
  en: v.string(),
  uk: v.string(),
  ru: v.string(),
  be: v.string(),
});

export type CopyFields = {
  name: string;
  description: string;
  address: string;
};

export type PlaceCopy = Record<Lang, CopyFields>;

export type LangNames = Record<Lang, string>;

export function blankCopy(): CopyFields {
  return { name: "", description: "", address: "" };
}

export function emptyPlaceCopy(): PlaceCopy {
  return {
    pl: blankCopy(),
    en: blankCopy(),
    uk: blankCopy(),
    ru: blankCopy(),
    be: blankCopy(),
  };
}

export function emptyLangNames(): LangNames {
  return { pl: "", en: "", uk: "", ru: "", be: "" };
}

export function clonePlaceCopy(copy: PlaceCopy): PlaceCopy {
  const next = emptyPlaceCopy();
  for (const lang of LANGS) {
    next[lang] = { ...copy[lang] };
  }
  return next;
}

export function withPlaceCopy(
  partial: Partial<Record<Lang, Partial<CopyFields>>>,
): PlaceCopy {
  const copy = emptyPlaceCopy();
  for (const lang of LANGS) {
    const src = partial[lang];
    if (src) {
      copy[lang] = {
        name: src.name ?? "",
        description: src.description ?? "",
        address: src.address ?? "",
      };
    }
  }
  return copy;
}

export function readCopyField(
  copy: PlaceCopy,
  field: keyof CopyFields,
): string {
  for (const id of NAME_ORDER) {
    const value = copy[id][field].trim();
    if (value) return value;
  }
  return "";
}

export function displayPlaceName(copy: PlaceCopy): string {
  return readCopyField(copy, "name") || "Untitled place";
}

export function readLangName(names: LangNames): string {
  for (const id of NAME_ORDER) {
    const value = names[id].trim();
    if (value) return value;
  }
  return "Untitled";
}

export function filledLangs(copy: PlaceCopy): Lang[] {
  return LANGS.filter((id) => copy[id].name.trim().length > 0);
}
