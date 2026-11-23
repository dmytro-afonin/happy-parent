import type { CatalogItem } from "@/lib/catalog";
import type { PublicPlace } from "@/lib/filter-places";

export const MAP_VARIANTS = ["a", "b", "c"] as const;

export type MapVariant = (typeof MAP_VARIANTS)[number];

/** Missing or unknown values use C, the map + search + category-chip mix. */
export function parseMapVariant(
  value: string | null | undefined,
): MapVariant {
  if (value === "a" || value === "b" || value === "c") return value;
  return "c";
}

/** Categories that show up most often in the loaded places, for the chip row. */
export function popularCategories(
  categories: CatalogItem[],
  places: PublicPlace[],
  limit = 6,
): CatalogItem[] {
  const counts = new Map<string, number>();
  for (const place of places) {
    for (const id of place.categoryIds) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  return [...categories]
    .sort((a, b) => {
      const byCount = (counts.get(b._id) ?? 0) - (counts.get(a._id) ?? 0);
      if (byCount !== 0) return byCount;
      return a.label.localeCompare(b.label, "en");
    })
    .slice(0, limit);
}
