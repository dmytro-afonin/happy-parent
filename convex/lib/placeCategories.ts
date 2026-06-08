import { v } from "convex/values"

export const PLACE_CATEGORIES = [
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

export type PlaceCategoryId = (typeof PLACE_CATEGORIES)[number]

export const placeCategoryValidator = v.union(
  v.literal("playground"),
  v.literal("park"),
  v.literal("cafe"),
  v.literal("restaurant"),
  v.literal("library"),
  v.literal("museum"),
  v.literal("pool"),
  v.literal("indoor-play"),
  v.literal("nature"),
  v.literal("zoo"),
)

export const PLACE_CATEGORY_META: Record<
  PlaceCategoryId,
  { label: string; description: string; color: string }
> = {
  playground: {
    label: "Playgrounds",
    description: "Outdoor play equipment and swings",
    color: "#f97316",
  },
  park: {
    label: "Parks",
    description: "Green spaces for picnics and play",
    color: "#22c55e",
  },
  cafe: {
    label: "Family cafés",
    description: "Cafés with space for kids",
    color: "#a855f7",
  },
  restaurant: {
    label: "Restaurants",
    description: "Kid-friendly dining spots",
    color: "#ef4444",
  },
  library: {
    label: "Libraries",
    description: "Reading corners and story times",
    color: "#3b82f6",
  },
  museum: {
    label: "Museums",
    description: "Interactive and science museums",
    color: "#6366f1",
  },
  pool: {
    label: "Swimming pools",
    description: "Pools with family lanes and splash zones",
    color: "#06b6d4",
  },
  "indoor-play": {
    label: "Indoor play",
    description: "Soft play and activity centers",
    color: "#ec4899",
  },
  nature: {
    label: "Nature trails",
    description: "Forests, trails, and outdoor exploration",
    color: "#84cc16",
  },
  zoo: {
    label: "Zoos & aquariums",
    description: "Animal encounters for curious kids",
    color: "#eab308",
  },
}

export function isPlaceCategoryId(value: string): value is PlaceCategoryId {
  return PLACE_CATEGORIES.includes(value as PlaceCategoryId)
}
