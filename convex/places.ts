import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import type { Doc, Id } from "./_generated/dataModel"
import type { QueryCtx } from "./_generated/server"

import {
  geometryTypeValidator,
  latLngValidator,
  validateGeometry,
} from "./lib/geometry"
import { placeCategoryValidator } from "./lib/placeCategories"
import { ensureAuthUser, requireAdminUser } from "./lib/users"

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
  tags: v.array(v.string()),
  createdBy: v.id("users"),
  createdAt: v.number(),
  updatedAt: v.number(),
  coverPhotoUrl: v.optional(v.string()),
  coverPhotoThumbnailUrl: v.optional(v.string()),
})

const photoInputValidator = v.object({
  imageKitFileId: v.string(),
  url: v.string(),
  thumbnailUrl: v.optional(v.string()),
  fileName: v.optional(v.string()),
})

async function enrichPlacesWithCoverPhotos(
  ctx: QueryCtx,
  places: Doc<"places">[],
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

export const list = query({
  args: {
    categories: v.optional(v.array(placeCategoryValidator)),
  },
  returns: v.array(placeListItemValidator),
  handler: async (ctx, args) => {
    let places: Doc<"places">[]

    if (args.categories && args.categories.length > 0) {
      const results = await Promise.all(
        args.categories.map((category) =>
          ctx.db
            .query("places")
            .withIndex("by_category", (q) => q.eq("category", category))
            .collect(),
        ),
      )

      places = results.flat().sort((a, b) => b.updatedAt - a.updatedAt)
    } else {
      places = await ctx.db.query("places").order("desc").collect()
    }

    return enrichPlacesWithCoverPhotos(ctx, places)
  },
})

export const listAllAdmin = query({
  args: {},
  returns: v.array(placeListItemValidator),
  handler: async (ctx) => {
    await requireAdminUser(ctx)
    const places = await ctx.db.query("places").order("desc").collect()
    return enrichPlacesWithCoverPhotos(ctx, places)
  },
})

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
    tags: v.optional(v.array(v.string())),
    photos: v.optional(v.array(photoInputValidator)),
  },
  returns: v.id("places"),
  handler: async (ctx, args) => {
    await requireAdminUser(ctx)
    const userId = await ensureAuthUser(ctx)
    const name = args.name.trim()

    if (name.length === 0) {
      throw new Error("Name is required")
    }

    const point =
      args.lat !== undefined && args.lng !== undefined
        ? { lat: args.lat, lng: args.lng }
        : undefined

    const geometry = validateGeometry(args.geometryType, point, args.boundary)
    const now = Date.now()

    const placeId = await ctx.db.insert("places", {
      name,
      description: args.description?.trim() || undefined,
      address: args.address?.trim() || undefined,
      lat: geometry.lat,
      lng: geometry.lng,
      geometryType: args.geometryType,
      boundary: geometry.boundary,
      category: args.category,
      tags: args.tags ?? [],
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
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
        })
        sortOrder += 1
      }
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
    tags: v.optional(v.array(v.string())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdminUser(ctx)

    const place = await ctx.db.get(args.placeId)
    if (!place) {
      throw new Error("Place not found")
    }

    const name = args.name?.trim()
    if (name !== undefined && name.length === 0) {
      throw new Error("Name is required")
    }

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
      const point =
        lat !== undefined && lng !== undefined ? { lat, lng } : undefined
      const geometry = validateGeometry(geometryType, point, boundary)
      lat = geometry.lat
      lng = geometry.lng
      boundary = geometry.boundary
    }

    await ctx.db.patch(args.placeId, {
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

    const place = await ctx.db.get(args.placeId)
    if (!place) {
      throw new Error("Place not found")
    }

    const photos = await ctx.db
      .query("photos")
      .withIndex("by_place", (q) => q.eq("placeId", args.placeId))
      .collect()

    for (const photo of photos) {
      await ctx.db.delete(photo._id)
    }

    await ctx.db.delete(args.placeId)
    return null
  },
})
