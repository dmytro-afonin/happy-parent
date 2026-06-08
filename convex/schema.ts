import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

import { mapStyleIdValidator } from "./lib/mapStyles"
import { placeCategoryValidator } from "./lib/placeCategories"
import { userRoleValidator } from "./lib/roles"

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    role: v.optional(userRoleValidator),
    mapStyleId: v.optional(mapStyleIdValidator),
    activeCategories: v.optional(v.array(placeCategoryValidator)),
    sidePanelSection: v.optional(
      v.union(
        v.literal("categories"),
        v.literal("my-places"),
        v.literal("recents"),
      ),
    ),
    sidebarOpen: v.optional(v.boolean()),
  }).index("by_token", ["tokenIdentifier"]),

  recentSearches: defineTable({
    userId: v.id("users"),
    query: v.string(),
    label: v.string(),
    subtitle: v.optional(v.string()),
    lat: v.number(),
    lng: v.number(),
    externalId: v.optional(v.string()),
    searchedAt: v.number(),
  })
    .index("by_user_searchedAt", ["userId", "searchedAt"])
    .searchIndex("search_label", {
      searchField: "label",
      filterFields: ["userId"],
    })
    .searchIndex("search_query", {
      searchField: "query",
      filterFields: ["userId"],
    }),

  recentCategories: defineTable({
    userId: v.id("users"),
    category: placeCategoryValidator,
    searchedAt: v.number(),
  })
    .index("by_user_searchedAt", ["userId", "searchedAt"])
    .index("by_user_and_category", ["userId", "category"]),

  favouritePlaces: defineTable({
    userId: v.id("users"),
    name: v.string(),
    label: v.string(),
    subtitle: v.optional(v.string()),
    lat: v.number(),
    lng: v.number(),
    externalId: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  places: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    address: v.optional(v.string()),
    lat: v.number(),
    lng: v.number(),
    geometryType: v.optional(
      v.union(v.literal("point"), v.literal("polygon")),
    ),
    boundary: v.optional(
      v.array(
        v.object({
          lat: v.number(),
          lng: v.number(),
        }),
      ),
    ),
    category: placeCategoryValidator,
    tags: v.array(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_creator", ["createdBy"])
    .index("by_category", ["category"]),

  savedPlaces: defineTable({
    userId: v.id("users"),
    placeId: v.id("places"),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_place", ["userId", "placeId"]),

  photos: defineTable({
    placeId: v.id("places"),
    uploaderId: v.id("users"),
    imageKitFileId: v.string(),
    url: v.string(),
    thumbnailUrl: v.optional(v.string()),
    fileName: v.optional(v.string()),
    sortOrder: v.number(),
    createdAt: v.number(),
  })
    .index("by_place", ["placeId"])
    .index("by_uploader", ["uploaderId"]),
})
