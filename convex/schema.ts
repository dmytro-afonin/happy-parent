import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { langNamesValidator, placeCopyValidator } from "./lib/copy";

const langValidator = v.union(
  v.literal("pl"),
  v.literal("en"),
  v.literal("uk"),
  v.literal("ru"),
  v.literal("be"),
);

const pointValidator = v.object({
  lat: v.number(),
  lng: v.number(),
});

/**
 * Expand phase: legacy place fields stay optional so existing docs still
 * validate. New fields are written by seed/migrations and all new mutations.
 * Contract (drop legacy) after `migrations:backfillPlacesV2` has run everywhere.
 */
export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    role: v.union(v.literal("user"), v.literal("admin")),
  }).index("by_token", ["tokenIdentifier"]),

  catalogItems: defineTable({
    kind: v.union(v.literal("category"), v.literal("attribute")),
    slug: v.string(),
    names: langNamesValidator,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_kind", ["kind"])
    .index("by_slug", ["slug"]),

  places: defineTable({
    // --- new shape ---
    copy: v.optional(placeCopyValidator),
    categoryIds: v.optional(v.array(v.id("catalogItems"))),
    attributeIds: v.optional(v.array(v.id("catalogItems"))),
    publishStatus: v.optional(
      v.union(v.literal("public"), v.literal("draft")),
    ),

    // --- shared geometry ---
    lat: v.number(),
    lng: v.number(),
    geometryType: v.union(v.literal("point"), v.literal("polygon")),
    boundary: v.optional(v.array(pointValidator)),

    // --- legacy (pre–multilang / fixed catalog) ---
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    address: v.optional(v.string()),
    type: v.optional(v.string()),
    attributes: v.optional(v.array(v.string())),
    status: v.optional(
      v.union(v.literal("approved"), v.literal("pending")),
    ),

    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_publish_status", ["publishStatus"])
    .index("by_status", ["status"]),

  moderationQueue: defineTable({
    kind: v.union(
      v.literal("place"),
      v.literal("edit"),
      v.literal("translation"),
      v.literal("photo"),
      v.literal("comment"),
    ),
    placeId: v.id("places"),
    submittedBy: v.id("users"),
    language: v.optional(langValidator),
    detail: v.string(),
    body: v.optional(v.string()),
    field: v.optional(
      v.union(
        v.literal("name"),
        v.literal("description"),
        v.literal("address"),
      ),
    ),
    photoId: v.optional(v.id("photos")),
    commentId: v.optional(v.id("comments")),
    createdAt: v.number(),
  })
    .index("by_place", ["placeId"])
    .index("by_kind", ["kind"]),

  comments: defineTable({
    placeId: v.id("places"),
    userId: v.id("users"),
    body: v.string(),
    language: langValidator,
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
    ),
    createdAt: v.number(),
  }).index("by_place_status", ["placeId", "status"]),

  photos: defineTable({
    placeId: v.id("places"),
    userId: v.id("users"),
    storageId: v.id("_storage"),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
    ),
    createdAt: v.number(),
  }).index("by_place_status", ["placeId", "status"]),

  favorites: defineTable({
    userId: v.id("users"),
    placeId: v.id("places"),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_place", ["userId", "placeId"]),
});
