import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
  }).index("by_token", ["tokenIdentifier"]),

  places: defineTable({
    name: v.string(),
    lat: v.number(),
    lng: v.number(),
    tags: v.array(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_creator", ["createdBy"]),

  savedPlaces: defineTable({
    userId: v.id("users"),
    placeId: v.id("places"),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_place", ["userId", "placeId"]),

  photos: defineTable({
    storageId: v.id("_storage"),
    placeId: v.id("places"),
    uploaderId: v.id("users"),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
    ),
  })
    .index("by_place", ["placeId"])
    .index("by_uploader", ["uploaderId"]),
})
