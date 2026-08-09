import { mutation, query } from "./_generated/server"
import { v } from "convex/values"

import { ensureAuthUser, getAuthUserId } from "./lib/users"

const favouritePlaceValidator = v.object({
  _id: v.id("favouritePlaces"),
  _creationTime: v.number(),
  userId: v.id("users"),
  name: v.string(),
  label: v.string(),
  subtitle: v.optional(v.string()),
  lat: v.number(),
  lng: v.number(),
  externalId: v.optional(v.string()),
  createdAt: v.number(),
})

export const list = query({
  args: {},
  returns: v.array(favouritePlaceValidator),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      return []
    }

    return await ctx.db
      .query("favouritePlaces")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect()
  },
})

export const save = mutation({
  args: {
    name: v.string(),
    label: v.string(),
    subtitle: v.optional(v.string()),
    lat: v.number(),
    lng: v.number(),
    externalId: v.optional(v.string()),
  },
  returns: v.id("favouritePlaces"),
  handler: async (ctx, args) => {
    const userId = await ensureAuthUser(ctx)
    const name = args.name.trim()

    if (name.length === 0) {
      throw new Error("Name is required")
    }

    return await ctx.db.insert("favouritePlaces", {
      userId,
      name,
      label: args.label,
      subtitle: args.subtitle,
      lat: args.lat,
      lng: args.lng,
      externalId: args.externalId,
      createdAt: Date.now(),
    })
  },
})

export const remove = mutation({
  args: {
    favouriteId: v.id("favouritePlaces"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await ensureAuthUser(ctx)
    const favourite = await ctx.db.get("favouritePlaces", args.favouriteId)

    if (!favourite || favourite.userId !== userId) {
      throw new Error("Favourite not found")
    }

    await ctx.db.delete("favouritePlaces", args.favouriteId)
    return null
  },
})
