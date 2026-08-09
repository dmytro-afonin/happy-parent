import { paginationOptsValidator } from "convex/server"
import { mutation, query } from "./_generated/server"
import { v } from "convex/values"

import { ensureAuthUser, getAuthUserId } from "./lib/users"

const savedPlaceItemValidator = v.object({
  _id: v.id("savedPlaces"),
  placeId: v.id("places"),
  placeName: v.optional(v.string()),
  lat: v.optional(v.number()),
  lng: v.optional(v.number()),
})

export const list = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  returns: v.object({
    page: v.array(savedPlaceItemValidator),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      return { page: [], isDone: true, continueCursor: "" }
    }

    const page = await ctx.db
      .query("savedPlaces")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .paginate(args.paginationOpts)

    const resolved = await Promise.all(
      page.page.map(async (entry) => {
        const place = await ctx.db.get("places", entry.placeId)
        return {
          _id: entry._id,
          placeId: entry.placeId,
          placeName: place?.name,
          lat: place?.lat,
          lng: place?.lng,
        }
      })
    )

    return {
      page: resolved,
      isDone: page.isDone,
      continueCursor: page.continueCursor,
    }
  },
})

/** Single-place check for the place card Save toggle. */
export const isSaved = query({
  args: {
    placeId: v.id("places"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      return false
    }

    const existing = await ctx.db
      .query("savedPlaces")
      .withIndex("by_user_and_place", (q) =>
        q.eq("userId", userId).eq("placeId", args.placeId)
      )
      .unique()

    return existing !== null
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
