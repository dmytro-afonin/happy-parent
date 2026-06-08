import { v } from "convex/values"

import { placeCategoryValidator } from "./placeCategories"

export const sidePanelSectionValidator = v.union(
  v.literal("categories"),
  v.literal("my-places"),
  v.literal("recents"),
)

export type SidePanelSection = "categories" | "my-places" | "recents"

export const mapPreferencesValidator = v.object({
  mapStyleId: v.optional(v.string()),
  activeCategories: v.optional(v.array(placeCategoryValidator)),
  sidePanelSection: v.optional(sidePanelSectionValidator),
  sidebarOpen: v.optional(v.boolean()),
})
