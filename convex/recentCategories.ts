import { mutation, query } from "./_generated/server"
import { v } from "convex/values"

import { placeCategoryValidator } from "./lib/placeCategories"
import { ensureAuthUser, getAuthUserId } from "./lib/users"

const MAX_RECENT_CATEGORIES = 50

const recentCategoryValidator = v.object({
  category: placeCategoryValidator,
  searchedAt: v.number(),
})

export const list = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(recentCategoryValidator),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      return []
    }

    return (
      await ctx.db
        .query("recentCategories")
        .withIndex("by_user_searchedAt", (q) => q.eq("userId", userId))
        .order("desc")
        .take(args.limit ?? 10)
    ).map((entry) => ({
      category: entry.category,
      searchedAt: entry.searchedAt,
    }))
  },
})

export const record = mutation({
  args: {
    category: placeCategoryValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await ensureAuthUser(ctx)

    const existing = await ctx.db
      .query("recentCategories")
      .withIndex("by_user_and_category", (q) =>
        q.eq("userId", userId).eq("category", args.category),
      )
      .unique()

    if (existing) {
      await ctx.db.delete(existing._id)
    }

    await ctx.db.insert("recentCategories", {
      userId,
      category: args.category,
      searchedAt: Date.now(),
    })

    const overflow = await ctx.db
      .query("recentCategories")
      .withIndex("by_user_searchedAt", (q) => q.eq("userId", userId))
      .order("asc")
      .take(MAX_RECENT_CATEGORIES + 1)

    if (overflow.length > MAX_RECENT_CATEGORIES) {
      const deleteCount = overflow.length - MAX_RECENT_CATEGORIES
      for (const entry of overflow.slice(0, deleteCount)) {
        await ctx.db.delete(entry._id)
      }
    }

    return null
  },
})
