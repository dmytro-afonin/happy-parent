import { mutation, query } from "./_generated/server"
import { v } from "convex/values"

import { ensureAuthUser, requireAdminUser } from "./lib/users"

const photoValidator = v.object({
  _id: v.id("photos"),
  _creationTime: v.number(),
  placeId: v.id("places"),
  uploaderId: v.id("users"),
  imageKitFileId: v.string(),
  url: v.string(),
  thumbnailUrl: v.optional(v.string()),
  fileName: v.optional(v.string()),
  sortOrder: v.number(),
  createdAt: v.number(),
})

const photoInputValidator = v.object({
  imageKitFileId: v.string(),
  url: v.string(),
  thumbnailUrl: v.optional(v.string()),
  fileName: v.optional(v.string()),
})

export const listByPlace = query({
  args: {
    placeId: v.id("places"),
  },
  returns: v.array(photoValidator),
  handler: async (ctx, args) => {
    const photos = await ctx.db
      .query("photos")
      .withIndex("by_place", (q) => q.eq("placeId", args.placeId))
      .collect()

    return photos.sort((a, b) => a.sortOrder - b.sortOrder)
  },
})

export const attachMany = mutation({
  args: {
    placeId: v.id("places"),
    photos: v.array(photoInputValidator),
  },
  returns: v.array(v.id("photos")),
  handler: async (ctx, args) => {
    await requireAdminUser(ctx)
    const userId = await ensureAuthUser(ctx)

    const place = await ctx.db.get(args.placeId)
    if (!place) {
      throw new Error("Place not found")
    }

    const existing = await ctx.db
      .query("photos")
      .withIndex("by_place", (q) => q.eq("placeId", args.placeId))
      .collect()

    const now = Date.now()
    let sortOrder = existing.length
    const photoIds = []

    for (const photo of args.photos) {
      const photoId = await ctx.db.insert("photos", {
        placeId: args.placeId,
        uploaderId: userId,
        imageKitFileId: photo.imageKitFileId,
        url: photo.url,
        thumbnailUrl: photo.thumbnailUrl,
        fileName: photo.fileName,
        sortOrder,
        createdAt: now,
      })
      photoIds.push(photoId)
      sortOrder += 1
    }

    return photoIds
  },
})

export const remove = mutation({
  args: {
    photoId: v.id("photos"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdminUser(ctx)

    const photo = await ctx.db.get(args.photoId)
    if (!photo) {
      throw new Error("Photo not found")
    }

    await ctx.db.delete(args.photoId)
    return null
  },
})
