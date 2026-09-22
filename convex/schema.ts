import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

import { localeValidator } from "./lib/locales"
import { mapStyleIdValidator } from "./lib/mapStyles"
import {
  moderationFields,
  moderationStatusValidator,
  translationStatusValidator,
} from "./lib/moderation"
import {
  placeCategorySchemaValidator,
  placeCategoryValidator,
} from "./lib/placeCategories"
import { userRoleValidator } from "./lib/roles"

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    role: v.optional(userRoleValidator),
    mapStyleId: v.optional(mapStyleIdValidator),
    // Stored as plain strings so legacy category ids remain valid documents;
    // normalized when read in mapPreferences.
    activeCategories: v.optional(v.array(v.string())),
    sidePanelSection: v.optional(
      v.union(
        v.literal("categories"),
        v.literal("my-places"),
        v.literal("recents")
      )
    ),
    sidebarOpen: v.optional(v.boolean()),
    // Internal trust rating derived from moderation outcomes.
    submissionsApproved: v.optional(v.number()),
    submissionsRejected: v.optional(v.number()),
    placesRequested: v.optional(v.number()),
    placesApproved: v.optional(v.number()),
    changesRequested: v.optional(v.number()),
    changesApproved: v.optional(v.number()),
    titleChangesRequested: v.optional(v.number()),
    titleChangesApproved: v.optional(v.number()),
    descriptionChangesRequested: v.optional(v.number()),
    descriptionChangesApproved: v.optional(v.number()),
    locationChangesRequested: v.optional(v.number()),
    locationChangesApproved: v.optional(v.number()),
    photoChangesRequested: v.optional(v.number()),
    photoChangesApproved: v.optional(v.number()),
    labelChangesRequested: v.optional(v.number()),
    labelChangesApproved: v.optional(v.number()),
    translationChangesRequested: v.optional(v.number()),
    translationChangesApproved: v.optional(v.number()),
    commentsRequested: v.optional(v.number()),
    commentsApproved: v.optional(v.number()),
    /** Cooldown marker for batched moderation notification emails. */
    lastModerationNotifyAt: v.optional(v.number()),
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
    // Plain string so legacy category ids remain valid; normalized on read.
    category: v.string(),
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

  labels: defineTable({
    slug: v.string(),
    /** English base name; localized via the translations table. */
    name: v.string(),
    category: placeCategoryValidator,
    createdBy: v.optional(v.id("users")),
    createdAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_category", ["category"]),

  places: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    address: v.optional(v.string()),
    lat: v.number(),
    lng: v.number(),
    geometryType: v.optional(v.union(v.literal("point"), v.literal("polygon"))),
    boundary: v.optional(
      v.array(
        v.object({
          lat: v.number(),
          lng: v.number(),
        })
      )
    ),
    // Accepts legacy ids until migrations:migrateLegacyCategories runs.
    category: placeCategorySchemaValidator,
    labelIds: v.optional(v.array(v.id("labels"))),
    tags: v.array(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
    /** Locale the author wrote the place in. Other locales count as missing. */
    sourceLocale: v.optional(localeValidator),
    ...moderationFields,
  })
    .index("by_creator", ["createdBy"])
    .index("by_category", ["category"])
    .index("by_status", ["status"]),

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
    ...moderationFields,
  })
    .index("by_place", ["placeId"])
    .index("by_uploader", ["uploaderId"])
    .index("by_status", ["status"]),

  placeComments: defineTable({
    placeId: v.id("places"),
    authorId: v.id("users"),
    text: v.string(),
    status: moderationStatusValidator,
    rejectionComment: v.optional(v.string()),
    moderatedBy: v.optional(v.id("users")),
    moderatedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_place", ["placeId"])
    .index("by_author", ["authorId"])
    .index("by_status", ["status"]),

  translations: defineTable({
    entityType: v.union(
      v.literal("category"),
      v.literal("label"),
      v.literal("placeName"),
      v.literal("placeDescription")
    ),
    /** Category id or label slug. */
    entityKey: v.string(),
    locale: localeValidator,
    value: v.string(),
    status: translationStatusValidator,
    createdBy: v.optional(v.id("users")),
    rejectionComment: v.optional(v.string()),
    moderatedBy: v.optional(v.id("users")),
    moderatedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_locale_and_status", ["locale", "status"])
    .index("by_entity", ["entityType", "entityKey", "locale"])
    .index("by_status", ["status"]),

  placeSuggestions: defineTable({
    placeId: v.id("places"),
    authorId: v.id("users"),
    kind: v.union(
      v.literal("name"),
      v.literal("description"),
      v.literal("location"),
      v.literal("label"),
      v.literal("translation")
    ),
    text: v.optional(v.string()),
    locale: v.optional(localeValidator),
    translationField: v.optional(
      v.union(v.literal("name"), v.literal("description"))
    ),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    geometryType: v.optional(v.union(v.literal("point"), v.literal("polygon"))),
    boundary: v.optional(
      v.array(
        v.object({
          lat: v.number(),
          lng: v.number(),
        })
      )
    ),
    status: moderationStatusValidator,
    rejectionComment: v.optional(v.string()),
    moderatedBy: v.optional(v.id("users")),
    moderatedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_place", ["placeId"])
    .index("by_status", ["status"])
    .index("by_author", ["authorId"]),
})
