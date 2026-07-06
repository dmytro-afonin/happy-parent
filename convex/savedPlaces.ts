import { mutation, query } from "./_generated/server"
import { v } from "convex/values"

import { ensureAuthUser, getAuthUserId } from "./lib/users"

export const list = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("savedPlaces"),
      placeId: v.id("places"),
      placeName: v.optional(v.string()),
      lat: v.optional(v.number()),
      lng: v.optional(v.number()),
    })
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      return []
    }

    const saved = await ctx.db
      .query("savedPlaces")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect()

    const results = []
    for (const entry of saved) {
      const place = await ctx.db.get("places", entry.placeId)
      results.push({
        _id: entry._id,
        placeId: entry.placeId,
        placeName: place?.name,
        lat: place?.lat,
        lng: place?.lng,
      })
    }

    return results
  },
})

export const toggle = mutation({
  args: {
    placeId: v.id("places"),
  },
  returns: v.object({ saved: v.boolean() }),
  handler: async (ctx, args) => {
    const userId = await ensureAuthUser(ctx)

    const place = await ctx.db.get("places", args.placeId)
    if (!place) {
      throw new Error("Place not found")
    }

    const existing = await ctx.db
      .query("savedPlaces")
      .withIndex("by_user_and_place", (q) =>
        q.eq("userId", userId).eq("placeId", args.placeId)
      )
      .unique()

    if (existing) {
      await ctx.db.delete("savedPlaces", existing._id)
      return { saved: false }
    }

    await ctx.db.insert("savedPlaces", {
      userId,
      placeId: args.placeId,
    })

    return { saved: true }
  },
})
