import { v } from "convex/values"

/**
 * Generic, wide-range place categories. Everything more specific (playground,
 * restaurant, clinic, …) is a label attached to a place.
 */
export const PLACE_CATEGORIES = ["food", "utilities", "entertainment"] as const

export type PlaceCategoryId = (typeof PLACE_CATEGORIES)[number]

export const placeCategoryValidator = v.union(
  v.literal("food"),
  v.literal("utilities"),
  v.literal("entertainment")
)

/**
 * Category ids used before the generic-categories rework. They are kept in the
 * schema validator so existing documents stay valid until
 * `migrations:migrateLegacyCategories` rewrites them.
 */
export const LEGACY_PLACE_CATEGORIES = [
  "playground",
  "park",
  "cafe",
  "restaurant",
  "library",
  "museum",
  "pool",
  "indoor-play",
  "nature",
  "zoo",
] as const

export type LegacyPlaceCategoryId = (typeof LEGACY_PLACE_CATEGORIES)[number]

export const placeCategorySchemaValidator = v.union(
  v.literal("food"),
  v.literal("utilities"),
  v.literal("entertainment"),
  v.literal("playground"),
  v.literal("park"),
  v.literal("cafe"),
  v.literal("restaurant"),
  v.literal("library"),
  v.literal("museum"),
  v.literal("pool"),
  v.literal("indoor-play"),
  v.literal("nature"),
  v.literal("zoo")
)

/** Maps a legacy category to its generic category and equivalent label slug. */
export const LEGACY_CATEGORY_MAP: Record<
  LegacyPlaceCategoryId,
  { category: PlaceCategoryId; labelSlug: string }
> = {
  playground: { category: "entertainment", labelSlug: "playground" },
  park: { category: "entertainment", labelSlug: "park" },
  cafe: { category: "food", labelSlug: "cafe" },
  restaurant: { category: "food", labelSlug: "restaurant" },
  library: { category: "entertainment", labelSlug: "library" },
  museum: { category: "entertainment", labelSlug: "museum" },
  pool: { category: "entertainment", labelSlug: "pool" },
  "indoor-play": { category: "entertainment", labelSlug: "kids-play-zone" },
  nature: { category: "entertainment", labelSlug: "walking-zone" },
  zoo: { category: "entertainment", labelSlug: "zoo" },
}

export function isPlaceCategoryId(value: string): value is PlaceCategoryId {
  return PLACE_CATEGORIES.includes(value as PlaceCategoryId)
}

export function isLegacyPlaceCategoryId(
  value: string
): value is LegacyPlaceCategoryId {
  return LEGACY_PLACE_CATEGORIES.includes(value as LegacyPlaceCategoryId)
}

export function normalizePlaceCategory(value: string): PlaceCategoryId {
  if (isPlaceCategoryId(value)) {
    return value
  }

  if (isLegacyPlaceCategoryId(value)) {
    return LEGACY_CATEGORY_MAP[value].category
  }

  return "entertainment"
}

export const PLACE_CATEGORY_META: Record<
  PlaceCategoryId,
  { label: string; description: string; color: string }
> = {
  food: {
    label: "Food",
    description: "Restaurants, cafés, food courts and other family dining",
    color: "#ef4444",
  },
  utilities: {
    label: "Utilities",
    description: "Toilets, baby changing rooms, clinics and pharmacies",
    color: "#3b82f6",
  },
  entertainment: {
    label: "Entertainment",
    description: "Parks, playgrounds, walking zones and kids play zones",
    color: "#22c55e",
  },
}
