import { mutation, query } from "./_generated/server"
import { v } from "convex/values"

import { internal } from "./_generated/api"
import { effectiveStatus, moderationStatusValidator } from "./lib/moderation"
import { isAdminRole } from "./lib/roles"
import { ensureAuthUser, getAuthUser, requireAdminUser } from "./lib/users"

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
  status: moderationStatusValidator,
  rejectionComment: v.optional(v.string()),
  isOwn: v.boolean(),
})

const photoInputValidator = v.object({
  imageKitFileId: v.string(),
  url: v.string(),
  thumbnailUrl: v.optional(v.string()),
  fileName: v.optional(v.string()),
})

/**
 * Approved photos are public. Uploaders also see their own pending/rejected
 * photos; admins see everything.
 */
export const listByPlace = query({
  args: {
    placeId: v.id("places"),
  },
  returns: v.array(photoValidator),
  handler: async (ctx, args) => {
    const viewer = await getAuthUser(ctx)
    const isAdmin = isAdminRole(viewer?.role)

    const photos = await ctx.db
      .query("photos")
      .withIndex("by_place", (q) => q.eq("placeId", args.placeId))
      .collect()

    return photos
      .filter((photo) => {
        const status = effectiveStatus(photo.status)
        if (status === "approved" || isAdmin) {
          return true
        }
        return viewer !== null && photo.uploaderId === viewer._id
      })
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((photo) => ({
        _id: photo._id,
        _creationTime: photo._creationTime,
        placeId: photo.placeId,
        uploaderId: photo.uploaderId,
        imageKitFileId: photo.imageKitFileId,
        url: photo.url,
        thumbnailUrl: photo.thumbnailUrl,
        fileName: photo.fileName,
        sortOrder: photo.sortOrder,
        createdAt: photo.createdAt,
        status: effectiveStatus(photo.status),
        rejectionComment: photo.rejectionComment,
        isOwn: viewer !== null && photo.uploaderId === viewer._id,
      }))
  },
})

/**
 * Any signed-in user can contribute photos to a place. Admin uploads are
 * approved immediately; user uploads go through moderation.
 */
export const attachMany = mutation({
  args: {
    placeId: v.id("places"),
    photos: v.array(photoInputValidator),
  },
  returns: v.array(v.id("photos")),
  handler: async (ctx, args) => {
    const userId = await ensureAuthUser(ctx)
    const user = await ctx.db.get("users", userId)
    const isAdmin = isAdminRole(user?.role)

    const place = await ctx.db.get("places", args.placeId)
    if (!place) {
      throw new Error("Place not found")
    }

    const existing = await ctx.db
      .query("photos")
      .withIndex("by_place", (q) => q.eq("placeId", args.placeId))
      .collect()

    const now = Date.now()
    const status = isAdmin ? ("approved" as const) : ("pending" as const)
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
        status,
      })
      photoIds.push(photoId)
      sortOrder += 1
    }

    if (status === "pending" && args.photos.length > 0) {
      await ctx.scheduler.runAfter(0, internal.emails.notifyModerationRequest, {
        kind: "photo",
        summary: `${args.photos.length} photo(s) for ${place.name}`,
        submitterName: user?.name ?? user?.email,
      })
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

    const photo = await ctx.db.get("photos", args.photoId)
    if (!photo) {
      throw new Error("Photo not found")
    }

    await ctx.db.delete("photos", args.photoId)
    return null
  },
})
