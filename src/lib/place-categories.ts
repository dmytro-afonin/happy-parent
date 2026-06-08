import type { LucideIcon } from "lucide-react"
import {
  BookOpenIcon,
  CastleIcon,
  CoffeeIcon,
  LandmarkIcon,
  LeafIcon,
  PawPrintIcon,
  ToyBrickIcon,
  TreePineIcon,
  UtensilsCrossedIcon,
  WavesIcon,
} from "lucide-react"

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

type PlaceCategoryMeta = {
  label: string
  description: string
  color: string
  icon: LucideIcon
  searchHint: string
}

export const PLACE_CATEGORY_META: Record<PlaceCategoryId, PlaceCategoryMeta> = {
  playground: {
    label: "Playgrounds",
    description: "Outdoor play equipment and swings",
    color: "#f97316",
    icon: ToyBrickIcon,
    searchHint: "Slides, swings, and climbing frames",
  },
  park: {
    label: "Parks",
    description: "Green spaces for picnics and play",
    color: "#22c55e",
    icon: TreePineIcon,
    searchHint: "Lawns, paths, and open air",
  },
  cafe: {
    label: "Family cafés",
    description: "Cafés with space for kids",
    color: "#a855f7",
    icon: CoffeeIcon,
    searchHint: "High chairs and relaxed vibes",
  },
  restaurant: {
    label: "Restaurants",
    description: "Kid-friendly dining spots",
    color: "#ef4444",
    icon: UtensilsCrossedIcon,
    searchHint: "Menus and space for families",
  },
  library: {
    label: "Libraries",
    description: "Reading corners and story times",
    color: "#3b82f6",
    icon: BookOpenIcon,
    searchHint: "Books, quiet zones, events",
  },
  museum: {
    label: "Museums",
    description: "Interactive and science museums",
    color: "#6366f1",
    icon: LandmarkIcon,
    searchHint: "Hands-on exhibits for kids",
  },
  pool: {
    label: "Swimming pools",
    description: "Pools with family lanes and splash zones",
    color: "#06b6d4",
    icon: WavesIcon,
    searchHint: "Swimming and splash areas",
  },
  "indoor-play": {
    label: "Indoor play",
    description: "Soft play and activity centers",
    color: "#ec4899",
    icon: CastleIcon,
    searchHint: "Rainy-day energy burners",
  },
  nature: {
    label: "Nature trails",
    description: "Forests, trails, and outdoor exploration",
    color: "#84cc16",
    icon: LeafIcon,
    searchHint: "Walks and wildlife spotting",
  },
  zoo: {
    label: "Zoos & aquariums",
    description: "Animal encounters for curious kids",
    color: "#eab308",
    icon: PawPrintIcon,
    searchHint: "Animals and marine life",
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
      category.id.replace("-", " ").includes(trimmed),
  )
}
