import { mutation, query } from "./_generated/server"
import { v } from "convex/values"

import { placeCategoryValidator } from "./lib/placeCategories"
import { requireAdminUser } from "./lib/users"

const labelValidator = v.object({
  _id: v.id("labels"),
  _creationTime: v.number(),
  slug: v.string(),
  name: v.string(),
  category: placeCategoryValidator,
  createdBy: v.optional(v.id("users")),
  createdAt: v.number(),
})

export const list = query({
  args: {},
  returns: v.array(labelValidator),
  handler: async (ctx) => {
    const labels = await ctx.db.query("labels").collect()
    return labels.sort((a, b) => a.name.localeCompare(b.name))
  },
})

export const create = mutation({
  args: {
    name: v.string(),
    category: placeCategoryValidator,
  },
  returns: v.id("labels"),
  handler: async (ctx, args) => {
    const admin = await requireAdminUser(ctx)

    const name = args.name.trim()
    if (name.length === 0) {
      throw new Error("Label name is required")
    }

    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")

    if (slug.length === 0) {
      throw new Error("Label name must contain latin characters or digits")
    }

    const existing = await ctx.db
      .query("labels")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique()

    if (existing) {
      throw new Error("A label with this name already exists")
    }

    return await ctx.db.insert("labels", {
      slug,
      name,
      category: args.category,
      createdBy: admin._id,
      createdAt: Date.now(),
    })
  },
})
