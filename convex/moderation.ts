import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import type { Id } from "./_generated/dataModel"
import type { MutationCtx, QueryCtx } from "./_generated/server"

import { localeValidator } from "./lib/locales"
import { recordModerationOutcome } from "./lib/moderation"
import {
  placeCategoryValidator,
  normalizePlaceCategory,
} from "./lib/placeCategories"
import { requireAdminUser } from "./lib/users"

const submitterValidator = v.object({
  name: v.optional(v.string()),
  email: v.optional(v.string()),
  submissionsApproved: v.number(),
  submissionsRejected: v.number(),
})

async function getSubmitter(ctx: QueryCtx, userId: Id<"users">) {
  const user = await ctx.db.get("users", userId)
  return {
    name: user?.name,
    email: user?.email,
    submissionsApproved: user?.submissionsApproved ?? 0,
    submissionsRejected: user?.submissionsRejected ?? 0,
  }
}

/** Everything currently awaiting an admin decision, grouped by type. */
export const listPending = query({
  args: {},
  returns: v.object({
    places: v.array(
      v.object({
        _id: v.id("places"),
        name: v.string(),
        description: v.optional(v.string()),
        address: v.optional(v.string()),
        lat: v.number(),
        lng: v.number(),
        category: placeCategoryValidator,
        labelNames: v.array(v.string()),
        createdAt: v.number(),
        submitter: submitterValidator,
      })
    ),
    photos: v.array(
      v.object({
        _id: v.id("photos"),
        placeName: v.optional(v.string()),
        url: v.string(),
        thumbnailUrl: v.optional(v.string()),
        createdAt: v.number(),
        submitter: submitterValidator,
      })
    ),
    comments: v.array(
      v.object({
        _id: v.id("placeComments"),
        placeName: v.optional(v.string()),
        text: v.string(),
        createdAt: v.number(),
        submitter: submitterValidator,
      })
    ),
    translations: v.array(
      v.object({
        _id: v.id("translations"),
        entityType: v.union(v.literal("category"), v.literal("label")),
        entityKey: v.string(),
        locale: localeValidator,
        value: v.string(),
        createdAt: v.number(),
        submitter: submitterValidator,
      })
    ),
  }),
  handler: async (ctx) => {
    await requireAdminUser(ctx)

    const [places, photos, comments, translations] = await Promise.all([
      ctx.db
        .query("places")
        .withIndex("by_status", (q) => q.eq("status", "pending"))
        .collect(),
      ctx.db
        .query("photos")
        .withIndex("by_status", (q) => q.eq("status", "pending"))
        .collect(),
      ctx.db
        .query("placeComments")
        .withIndex("by_status", (q) => q.eq("status", "pending"))
        .collect(),
      ctx.db
        .query("translations")
        .withIndex("by_status", (q) => q.eq("status", "pending"))
        .collect(),
    ])

    const allLabels = await ctx.db.query("labels").collect()
    const labelNameById = new Map(
      allLabels.map((label) => [label._id, label.name])
    )

    return {
      places: await Promise.all(
        places.map(async (place) => ({
          _id: place._id,
          name: place.name,
          description: place.description,
          address: place.address,
          lat: place.lat,
          lng: place.lng,
          category: normalizePlaceCategory(place.category),
          labelNames: (place.labelIds ?? [])
            .map((labelId) => labelNameById.get(labelId))
            .filter((name): name is string => Boolean(name)),
          createdAt: place.createdAt,
          submitter: await getSubmitter(ctx, place.createdBy),
        }))
      ),
      photos: await Promise.all(
        photos.map(async (photo) => {
          const place = await ctx.db.get("places", photo.placeId)
          return {
            _id: photo._id,
            placeName: place?.name,
            url: photo.url,
            thumbnailUrl: photo.thumbnailUrl,
            createdAt: photo.createdAt,
            submitter: await getSubmitter(ctx, photo.uploaderId),
          }
        })
      ),
      comments: await Promise.all(
        comments.map(async (comment) => {
          const place = await ctx.db.get("places", comment.placeId)
          return {
            _id: comment._id,
            placeName: place?.name,
            text: comment.text,
            createdAt: comment.createdAt,
            submitter: await getSubmitter(ctx, comment.authorId),
          }
        })
      ),
      translations: await Promise.all(
        translations.map(async (translation) => ({
          _id: translation._id,
          entityType: translation.entityType,
          entityKey: translation.entityKey,
          locale: translation.locale,
          value: translation.value,
          createdAt: translation.createdAt,
          submitter: translation.createdBy
            ? await getSubmitter(ctx, translation.createdBy)
            : {
                name: undefined,
                email: undefined,
                submissionsApproved: 0,
                submissionsRejected: 0,
              },
        }))
      ),
    }
  },
})

type Decision = {
  approve: boolean
  comment?: string
}

function decisionPatch(adminId: Id<"users">, { approve, comment }: Decision) {
  return {
    status: approve ? ("approved" as const) : ("rejected" as const),
    rejectionComment: approve ? undefined : comment?.trim() || undefined,
    moderatedBy: adminId,
    moderatedAt: Date.now(),
  }
}

async function finalizeDecision(
  ctx: MutationCtx,
  submitterId: Id<"users"> | undefined,
  approve: boolean
) {
  if (submitterId) {
    await recordModerationOutcome(ctx, submitterId, approve)
  }
}

export const decidePlace = mutation({
  args: {
    placeId: v.id("places"),
    approve: v.boolean(),
    comment: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const admin = await requireAdminUser(ctx)

    const place = await ctx.db.get("places", args.placeId)
    if (!place || place.status !== "pending") {
      throw new Error("Place is not awaiting moderation")
    }

    await ctx.db.patch("places", args.placeId, decisionPatch(admin._id, args))

    // Photos submitted together with the place follow the place decision.
    const photos = await ctx.db
      .query("photos")
      .withIndex("by_place", (q) => q.eq("placeId", args.placeId))
      .collect()

    for (const photo of photos) {
      if (photo.status === "pending" && photo.uploaderId === place.createdBy) {
        await ctx.db.patch("photos", photo._id, decisionPatch(admin._id, args))
      }
    }

    await finalizeDecision(ctx, place.createdBy, args.approve)
    return null
  },
})

export const decidePhoto = mutation({
  args: {
    photoId: v.id("photos"),
    approve: v.boolean(),
    comment: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const admin = await requireAdminUser(ctx)

    const photo = await ctx.db.get("photos", args.photoId)
    if (!photo || photo.status !== "pending") {
      throw new Error("Photo is not awaiting moderation")
    }

    await ctx.db.patch("photos", args.photoId, decisionPatch(admin._id, args))
    await finalizeDecision(ctx, photo.uploaderId, args.approve)
    return null
  },
})

export const decideComment = mutation({
  args: {
    commentId: v.id("placeComments"),
    approve: v.boolean(),
    comment: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const admin = await requireAdminUser(ctx)

    const entry = await ctx.db.get("placeComments", args.commentId)
    if (!entry || entry.status !== "pending") {
      throw new Error("Comment is not awaiting moderation")
    }

    await ctx.db.patch(
      "placeComments",
      args.commentId,
      decisionPatch(admin._id, args)
    )
    await finalizeDecision(ctx, entry.authorId, args.approve)
    return null
  },
})

export const decideTranslation = mutation({
  args: {
    translationId: v.id("translations"),
    approve: v.boolean(),
    comment: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const admin = await requireAdminUser(ctx)

    const translation = await ctx.db.get("translations", args.translationId)
    if (!translation || translation.status !== "pending") {
      throw new Error("Translation is not awaiting moderation")
    }

    if (args.approve) {
      // Replace the previously approved value for the same entity + locale.
      const existing = await ctx.db
        .query("translations")
        .withIndex("by_entity", (q) =>
          q
            .eq("entityType", translation.entityType)
            .eq("entityKey", translation.entityKey)
            .eq("locale", translation.locale)
        )
        .collect()

      for (const entry of existing) {
        if (entry.status === "approved" && entry._id !== translation._id) {
          await ctx.db.delete("translations", entry._id)
        }
      }
    }

    await ctx.db.patch(
      "translations",
      args.translationId,
      decisionPatch(admin._id, args)
    )
    await finalizeDecision(ctx, translation.createdBy, args.approve)
    return null
  },
})
