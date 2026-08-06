import { mutation, query } from "./_generated/server"
import { v } from "convex/values"

import { localeValidator } from "./lib/locales"
import { isPlaceCategoryId } from "./lib/placeCategories"
import { requireAdminUser } from "./lib/users"

const translationEntityValidator = v.union(
  v.literal("category"),
  v.literal("label")
)

/**
 * Approved translations of categories and place-type labels for one locale.
 * The UI falls back to English base names when no approved translation
 * exists.
 */
export const listApproved = query({
  args: {
    locale: localeValidator,
  },
  returns: v.array(
    v.object({
      entityType: translationEntityValidator,
      entityKey: v.string(),
      value: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const translations = await ctx.db
      .query("translations")
      .withIndex("by_locale_and_status", (q) =>
        q.eq("locale", args.locale).eq("status", "approved")
      )
      .collect()

    return translations.map((entry) => ({
      entityType: entry.entityType,
      entityKey: entry.entityKey,
      value: entry.value,
    }))
  },
})

/**
 * Set a translation for a category or place-type label. Admin-only: the new
 * value is applied immediately, replacing the previous approved value.
 */
export const set = mutation({
  args: {
    entityType: translationEntityValidator,
    entityKey: v.string(),
    locale: localeValidator,
    value: v.string(),
  },
  returns: v.id("translations"),
  handler: async (ctx, args) => {
    const admin = await requireAdminUser(ctx)

    const value = args.value.trim()
    if (value.length === 0) {
      throw new Error("Translation cannot be empty")
    }
    if (value.length > 200) {
      throw new Error("Translation is too long")
    }

    if (args.entityType === "category") {
      if (!isPlaceCategoryId(args.entityKey)) {
        throw new Error("Unknown category")
      }
    } else {
      const label = await ctx.db
        .query("labels")
        .withIndex("by_slug", (q) => q.eq("slug", args.entityKey))
        .unique()
      if (!label) {
        throw new Error("Unknown place type")
      }
    }

    const existing = await ctx.db
      .query("translations")
      .withIndex("by_entity", (q) =>
        q
          .eq("entityType", args.entityType)
          .eq("entityKey", args.entityKey)
          .eq("locale", args.locale)
      )
      .collect()

    for (const entry of existing) {
      if (entry.status === "approved") {
        await ctx.db.delete("translations", entry._id)
      }
    }

    return await ctx.db.insert("translations", {
      entityType: args.entityType,
      entityKey: args.entityKey,
      locale: args.locale,
      value,
      status: "approved",
      createdBy: admin._id,
      createdAt: Date.now(),
    })
  },
})
