import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import type { Doc, Id } from "./_generated/dataModel"
import type { QueryCtx } from "./_generated/server"

import { internal } from "./_generated/api"
import {
  geometryTypeValidator,
  latLngValidator,
  validateGeometry,
} from "./lib/geometry"
import { effectiveStatus, moderationStatusValidator } from "./lib/moderation"
import {
  normalizePlaceCategory,
  placeCategoryValidator,
} from "./lib/placeCategories"
import { isAdminRole } from "./lib/roles"
import { ensureAuthUser, getAuthUser, requireAdminUser } from "./lib/users"

const placeListItemValidator = v.object({
  _id: v.id("places"),
  _creationTime: v.number(),
  name: v.string(),
  description: v.optional(v.string()),
  address: v.optional(v.string()),
  lat: v.number(),
  lng: v.number(),
  geometryType: v.optional(geometryTypeValidator),
  boundary: v.optional(v.array(latLngValidator)),
  category: placeCategoryValidator,
  labelIds: v.array(v.id("labels")),
  tags: v.array(v.string()),
  createdBy: v.id("users"),
  createdAt: v.number(),
  updatedAt: v.number(),
  status: moderationStatusValidator,
  rejectionComment: v.optional(v.string()),
  isOwn: v.boolean(),
  coverPhotoUrl: v.optional(v.string()),
  coverPhotoThumbnailUrl: v.optional(v.string()),
})

const photoInputValidator = v.object({
  imageKitFileId: v.string(),
  url: v.string(),
  thumbnailUrl: v.optional(v.string()),
  fileName: v.optional(v.string()),
})

function toListItem(place: Doc<"places">, viewerId: Id<"users"> | null) {
  return {
    _id: place._id,
    _creationTime: place._creationTime,
    name: place.name,
    description: place.description,
    address: place.address,
    lat: place.lat,
    lng: place.lng,
    geometryType: place.geometryType,
    boundary: place.boundary,
    category: normalizePlaceCategory(place.category),
    labelIds: place.labelIds ?? [],
    tags: place.tags,
    createdBy: place.createdBy,
    createdAt: place.createdAt,
    updatedAt: place.updatedAt,
    status: effectiveStatus(place.status),
    rejectionComment: place.rejectionComment,
    isOwn: viewerId !== null && place.createdBy === viewerId,
  }
}

async function enrichPlacesWithCoverPhotos<T extends { _id: Id<"places"> }>(
  ctx: QueryCtx,
  places: T[]
) {
  if (places.length === 0) {
    return []
  }

  const photos = await ctx.db.query("photos").collect()
  const coverByPlace = new Map<
    Id<"places">,
    { url: string; thumbnailUrl?: string; sortOrder: number }
  >()

  for (const photo of photos) {
    if (effectiveStatus(photo.status) !== "approved") {
      continue
    }

    const current = coverByPlace.get(photo.placeId)
    if (!current || photo.sortOrder < current.sortOrder) {
      coverByPlace.set(photo.placeId, {
        url: photo.url,
        thumbnailUrl: photo.thumbnailUrl,
        sortOrder: photo.sortOrder,
      })
    }
  }

  return places.map((place) => {
    const cover = coverByPlace.get(place._id)
    return {
      ...place,
      coverPhotoUrl: cover?.url,
      coverPhotoThumbnailUrl: cover?.thumbnailUrl,
    }
  })
}

/**
 * Approved places are public. Pending/rejected submissions are only visible
 * to the submitter and to admins.
 */
export const list = query({
  args: {},
  returns: v.array(placeListItemValidator),
  handler: async (ctx) => {
    const viewer = await getAuthUser(ctx)
    const isAdmin = isAdminRole(viewer?.role)

    const places = await ctx.db.query("places").order("desc").collect()

    const visible = places.filter((place) => {
      const status = effectiveStatus(place.status)
      if (status === "approved") {
        return true
      }
      if (isAdmin) {
        return true
      }
      return viewer !== null && place.createdBy === viewer._id
    })

    return enrichPlacesWithCoverPhotos(
      ctx,
      visible.map((place) => toListItem(place, viewer?._id ?? null))
    )
  },
})

export const listAllAdmin = query({
  args: {},
  returns: v.array(placeListItemValidator),
  handler: async (ctx) => {
    const admin = await requireAdminUser(ctx)
    const places = await ctx.db.query("places").order("desc").collect()
    return enrichPlacesWithCoverPhotos(
      ctx,
      places.map((place) => toListItem(place, admin._id))
    )
  },
})

async function validateLabelIds(
  ctx: QueryCtx,
  labelIds: Id<"labels">[] | undefined
) {
  if (!labelIds) {
    return []
  }

  const unique = [...new Set(labelIds)]
  for (const labelId of unique) {
    const label = await ctx.db.get("labels", labelId)
    if (!label) {
      throw new Error("Unknown label")
    }
  }

  return unique
}

/**
 * Any signed-in user can add a place. Admin submissions are approved
 * immediately; regular users' submissions go through moderation and admins
 * are notified by email.
 */
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    address: v.optional(v.string()),
    geometryType: geometryTypeValidator,
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    boundary: v.optional(v.array(latLngValidator)),
    category: placeCategoryValidator,
    labelIds: v.optional(v.array(v.id("labels"))),
    tags: v.optional(v.array(v.string())),
    photos: v.optional(v.array(photoInputValidator)),
  },
  returns: v.id("places"),
  handler: async (ctx, args) => {
    const userId = await ensureAuthUser(ctx)
    const user = await ctx.db.get("users", userId)
    const isAdmin = isAdminRole(user?.role)

    const name = args.name.trim()
    if (name.length === 0) {
      throw new Error("Name is required")
    }

    const labelIds = await validateLabelIds(ctx, args.labelIds)

    const point =
      args.lat !== undefined && args.lng !== undefined
        ? { lat: args.lat, lng: args.lng }
        : undefined

    const geometry = validateGeometry(args.geometryType, point, args.boundary)
    const now = Date.now()
    const status = isAdmin ? ("approved" as const) : ("pending" as const)

    const placeId = await ctx.db.insert("places", {
      name,
      description: args.description?.trim() || undefined,
      address: args.address?.trim() || undefined,
      lat: geometry.lat,
      lng: geometry.lng,
      geometryType: args.geometryType,
      boundary: geometry.boundary,
      category: args.category,
      labelIds,
      tags: args.tags ?? [],
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
      status,
    })

    if (args.photos && args.photos.length > 0) {
      let sortOrder = 0
      for (const photo of args.photos) {
        await ctx.db.insert("photos", {
          placeId,
          uploaderId: userId,
          imageKitFileId: photo.imageKitFileId,
          url: photo.url,
          thumbnailUrl: photo.thumbnailUrl,
          fileName: photo.fileName,
          sortOrder,
          createdAt: now,
          status,
        })
        sortOrder += 1
      }
    }

    if (status === "pending") {
      await ctx.scheduler.runAfter(0, internal.emails.notifyModerationRequest, {
        kind: "place",
        summary: name,
        submitterName: user?.name ?? user?.email,
      })
    }

    return placeId
  },
})

export const update = mutation({
  args: {
    placeId: v.id("places"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    address: v.optional(v.string()),
    geometryType: v.optional(geometryTypeValidator),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    boundary: v.optional(v.array(latLngValidator)),
    category: v.optional(placeCategoryValidator),
    labelIds: v.optional(v.array(v.id("labels"))),
    tags: v.optional(v.array(v.string())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdminUser(ctx)

    const place = await ctx.db.get("places", args.placeId)
    if (!place) {
      throw new Error("Place not found")
    }

    const name = args.name?.trim()
    if (name !== undefined && name.length === 0) {
      throw new Error("Name is required")
    }

    const labelIds =
      args.labelIds !== undefined
        ? await validateLabelIds(ctx, args.labelIds)
        : undefined

    const geometryType = args.geometryType ?? place.geometryType ?? "point"
    let lat = args.lat ?? place.lat
    let lng = args.lng ?? place.lng
    let boundary = args.boundary ?? place.boundary

    if (
      args.geometryType !== undefined ||
      args.lat !== undefined ||
      args.lng !== undefined ||
      args.boundary !== undefined
    ) {
      const geometry = validateGeometry(geometryType, { lat, lng }, boundary)
      lat = geometry.lat
      lng = geometry.lng
      boundary = geometry.boundary
    }

    await ctx.db.patch("places", args.placeId, {
      ...(name !== undefined ? { name } : {}),
      ...(args.description !== undefined
        ? { description: args.description.trim() || undefined }
        : {}),
      ...(args.address !== undefined
        ? { address: args.address.trim() || undefined }
        : {}),
      ...(args.geometryType !== undefined ||
      args.lat !== undefined ||
      args.lng !== undefined ||
      args.boundary !== undefined
        ? {
            geometryType,
            lat,
            lng,
            boundary,
          }
        : {}),
      ...(args.category !== undefined ? { category: args.category } : {}),
      ...(labelIds !== undefined ? { labelIds } : {}),
      ...(args.tags !== undefined ? { tags: args.tags } : {}),
      updatedAt: Date.now(),
    })

    return null
  },
})

export const remove = mutation({
  args: {
    placeId: v.id("places"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdminUser(ctx)

    const place = await ctx.db.get("places", args.placeId)
    if (!place) {
      throw new Error("Place not found")
    }

    const photos = await ctx.db
      .query("photos")
      .withIndex("by_place", (q) => q.eq("placeId", args.placeId))
      .collect()

    for (const photo of photos) {
      await ctx.db.delete("photos", photo._id)
    }

    const comments = await ctx.db
      .query("placeComments")
      .withIndex("by_place", (q) => q.eq("placeId", args.placeId))
      .collect()

    for (const comment of comments) {
      await ctx.db.delete("placeComments", comment._id)
    }

    const saved = await ctx.db.query("savedPlaces").collect()
    for (const entry of saved) {
      if (entry.placeId === args.placeId) {
        await ctx.db.delete("savedPlaces", entry._id)
      }
    }

    await ctx.db.delete("places", args.placeId)
    return null
  },
})
