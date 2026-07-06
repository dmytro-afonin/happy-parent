import type { LucideIcon } from "lucide-react"
import { BabyIcon, FerrisWheelIcon, UtensilsCrossedIcon } from "lucide-react"

/**
 * Generic, wide-range place categories. Everything more specific
 * (playground, restaurant, clinic, …) is a label attached to a place.
 * Must stay in sync with convex/lib/placeCategories.ts.
 */
export const PLACE_CATEGORIES = ["food", "utilities", "entertainment"] as const

export type PlaceCategoryId = (typeof PLACE_CATEGORIES)[number]

type PlaceCategoryMeta = {
  label: string
  description: string
  color: string
  icon: LucideIcon
  searchHint: string
}

export const PLACE_CATEGORY_META: Record<PlaceCategoryId, PlaceCategoryMeta> = {
  food: {
    label: "Food",
    description: "Restaurants, cafés, food courts and other family dining",
    color: "#ef4444",
    icon: UtensilsCrossedIcon,
    searchHint: "Restaurants, cafés, food courts",
  },
  utilities: {
    label: "Utilities",
    description: "Toilets, baby changing rooms, clinics and pharmacies",
    color: "#3b82f6",
    icon: BabyIcon,
    searchHint: "Toilets, changing rooms, clinics",
  },
  entertainment: {
    label: "Entertainment",
    description: "Parks, playgrounds, walking zones and kids play zones",
    color: "#22c55e",
    icon: FerrisWheelIcon,
    searchHint: "Parks, playgrounds, play zones",
  },
}

export const PLACE_CATEGORY_LIST = PLACE_CATEGORIES.map((id) => ({
  id,
  ...PLACE_CATEGORY_META[id],
}))

export function isPlaceCategoryId(value: string): value is PlaceCategoryId {
  return PLACE_CATEGORIES.includes(value as PlaceCategoryId)
}

export function getCategoryMeta(category: PlaceCategoryId) {
  return PLACE_CATEGORY_META[category]
}

export function matchPlaceCategories(query: string) {
  const trimmed = query.trim().toLowerCase()
  if (trimmed.length === 0) {
    return []
  }

  return PLACE_CATEGORY_LIST.filter(
    (category) =>
      category.label.toLowerCase().includes(trimmed) ||
      category.searchHint.toLowerCase().includes(trimmed) ||
      category.description.toLowerCase().includes(trimmed) ||
      category.id.replace("-", " ").includes(trimmed)
  )
}
