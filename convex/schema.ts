import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    role: v.union(v.literal("user"), v.literal("admin")),
  }).index("by_token", ["tokenIdentifier"]),

  places: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    address: v.optional(v.string()),
    lat: v.number(),
    lng: v.number(),
    geometryType: v.union(v.literal("point"), v.literal("polygon")),
    boundary: v.optional(
      v.array(
        v.object({
          lat: v.number(),
          lng: v.number(),
        }),
      ),
    ),
    type: v.string(),
    attributes: v.array(v.string()),
    status: v.union(v.literal("approved"), v.literal("pending")),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_type", ["type"]),
});
