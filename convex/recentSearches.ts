import { mutation, query } from "./_generated/server"
import { v } from "convex/values"

import { placeSearchResultValidator } from "./lib/places"
import { ensureAuthUser, getAuthUserId } from "./lib/users"

const MAX_RECENT_SEARCHES = 1000

const recentSearchDocValidator = v.object({
  _id: v.id("recentSearches"),
  _creationTime: v.number(),
  userId: v.id("users"),
  query: v.string(),
  label: v.string(),
  subtitle: v.optional(v.string()),
  lat: v.number(),
  lng: v.number(),
  externalId: v.optional(v.string()),
  searchedAt: v.number(),
})

export const search = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(placeSearchResultValidator),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    const trimmed = args.query.trim()
    const limit = args.limit ?? 20

    if (!userId || trimmed.length === 0) {
      return []
    }

    const byLabel = await ctx.db
      .query("recentSearches")
      .withSearchIndex("search_label", (q) =>
        q.search("label", trimmed).eq("userId", userId),
      )
      .take(limit)

    const byQuery = await ctx.db
      .query("recentSearches")
      .withSearchIndex("search_query", (q) =>
        q.search("query", trimmed).eq("userId", userId),
      )
      .take(limit)

    const merged = new Map<string, (typeof byLabel)[number]>()
    for (const entry of [...byLabel, ...byQuery]) {
      merged.set(entry._id, entry)
    }

    return [...merged.values()]
      .sort((a, b) => b.searchedAt - a.searchedAt)
      .slice(0, limit)
      .map((entry) => ({
        id: `recent:${entry._id}`,
        label: entry.label,
        subtitle: entry.subtitle,
        lat: entry.lat,
        lng: entry.lng,
        source: "recent" as const,
        query: entry.query,
        externalId: entry.externalId,
      }))
  },
})

export const listRecent = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(recentSearchDocValidator),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      return []
    }

    return await ctx.db
      .query("recentSearches")
      .withIndex("by_user_searchedAt", (q) => q.eq("userId", userId))
      .order("desc")
      .take(args.limit ?? 20)
  },
})

export const record = mutation({
  args: {
    query: v.string(),
    label: v.string(),
    subtitle: v.optional(v.string()),
    lat: v.number(),
    lng: v.number(),
    externalId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await ensureAuthUser(ctx)

    await ctx.db.insert("recentSearches", {
      userId,
      query: args.query.trim(),
      label: args.label,
      subtitle: args.subtitle,
      lat: args.lat,
      lng: args.lng,
      externalId: args.externalId,
      searchedAt: Date.now(),
    })

    const overflow = await ctx.db
      .query("recentSearches")
      .withIndex("by_user_searchedAt", (q) => q.eq("userId", userId))
      .order("asc")
      .take(MAX_RECENT_SEARCHES + 1)

    if (overflow.length > MAX_RECENT_SEARCHES) {
      const deleteCount = overflow.length - MAX_RECENT_SEARCHES
      for (const entry of overflow.slice(0, deleteCount)) {
        await ctx.db.delete(entry._id)
      }
    }

    return null
  },
})
