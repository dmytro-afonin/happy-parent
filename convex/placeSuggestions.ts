import { mutation } from "./_generated/server"
import { v } from "convex/values"
import type { Doc, Id } from "./_generated/dataModel"
import type { MutationCtx } from "./_generated/server"

import {
  geometryTypeValidator,
  latLngValidator,
  validateGeometry,
} from "./lib/geometry"
import { normalizePlaceCategory } from "./lib/placeCategories"
import { localeValidator } from "./lib/locales"
import type { Locale } from "./lib/locales"
import { scheduleModerationNotify } from "./lib/moderationNotify"
import {
  bucketForSuggestionKind,
  noteApproved,
  noteRequested,
} from "./lib/reliability"
import { isAdminRole } from "./lib/roles"
import { ensureAuthUser, requireAdminUser } from "./lib/users"

const suggestionKindValidator = v.union(
  v.literal("name"),
  v.literal("description"),
  v.literal("location"),
  v.literal("label"),
  v.literal("translation")
)

export const submit = mutation({
  args: {
    placeId: v.id("places"),
    kind: suggestionKindValidator,
    text: v.optional(v.string()),
    locale: v.optional(localeValidator),
    translationField: v.optional(
      v.union(v.literal("name"), v.literal("description"))
    ),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    geometryType: v.optional(geometryTypeValidator),
    boundary: v.optional(v.array(latLngValidator)),
  },
  returns: v.id("placeSuggestions"),
  handler: async (ctx, args) => {
    const userId = await ensureAuthUser(ctx)
    const user = await ctx.db.get("users", userId)
    const place = await ctx.db.get("places", args.placeId)
    if (!place) {
      throw new Error("Place not found")
    }

    const suggestionId = await insertSuggestion(ctx, {
      placeId: args.placeId,
      authorId: userId,
      kind: args.kind,
      text: args.text,
      locale: args.locale,
      translationField: args.translationField,
      lat: args.lat,
      lng: args.lng,
      geometryType: args.geometryType,
      boundary: args.boundary,
      autoApprove: isAdminRole(user?.role),
    })

    if (!isAdminRole(user?.role)) {
      await scheduleModerationNotify(ctx, userId, {
        kind: "place",
        summary: `${place.name}: ${args.kind}`,
        submitterName: user?.name ?? user?.email,
      })
    }

    return suggestionId
  },
})

export const decide = mutation({
  args: {
    suggestionId: v.id("placeSuggestions"),
    approve: v.boolean(),
    comment: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const admin = await requireAdminUser(ctx)
    const suggestion = await ctx.db.get("placeSuggestions", args.suggestionId)
    if (!suggestion || suggestion.status !== "pending") {
      throw new Error("Suggestion is not awaiting moderation")
    }

    await settleSuggestion(
      ctx,
      suggestion,
      admin._id,
      args.approve,
      args.comment
    )
    return null
  },
})

type SuggestionDraft = {
  placeId: Id<"places">
  authorId: Id<"users">
  kind: "name" | "description" | "location" | "label" | "translation"
  text?: string
  locale?: Locale
  translationField?: "name" | "description"
  lat?: number
  lng?: number
  geometryType?: "point" | "polygon"
  boundary?: Array<{ lat: number; lng: number }>
  autoApprove: boolean
}

export async function insertSuggestion(
  ctx: MutationCtx,
  draft: SuggestionDraft
) {
  const text = draft.text?.trim()
  if (draft.kind !== "location" && (!text || text.length === 0)) {
    throw new Error("Suggestion text is required")
  }
  if (
    draft.kind === "translation" &&
    (!draft.locale || !draft.translationField)
  ) {
    throw new Error("Translation suggestions need a language and a field")
  }
  if (draft.kind === "location") {
    validateGeometry(
      draft.geometryType ?? "point",
      draft.lat !== undefined && draft.lng !== undefined
        ? { lat: draft.lat, lng: draft.lng }
        : undefined,
      draft.boundary
    )
  }

  const now = Date.now()
  const suggestionId = await ctx.db.insert("placeSuggestions", {
    placeId: draft.placeId,
    authorId: draft.authorId,
    kind: draft.kind,
    text: text || undefined,
    locale: draft.locale,
    translationField: draft.translationField,
    lat: draft.lat,
    lng: draft.lng,
    geometryType: draft.geometryType,
    boundary: draft.boundary,
    status: draft.autoApprove ? "approved" : "pending",
    createdAt: now,
    ...(draft.autoApprove
      ? { moderatedBy: draft.authorId, moderatedAt: now }
      : {}),
  })

  if (!draft.autoApprove) {
    await noteRequested(
      ctx,
      draft.authorId,
      bucketForSuggestionKind(draft.kind)
    )
    return suggestionId
  }

  const suggestion = await ctx.db.get("placeSuggestions", suggestionId)
  if (suggestion) {
    await applySuggestion(ctx, suggestion)
  }
  return suggestionId
}

export async function settleSuggestion(
  ctx: MutationCtx,
  suggestion: Doc<"placeSuggestions">,
  adminId: Id<"users">,
  approve: boolean,
  comment?: string
) {
  if (approve) {
    await applySuggestion(ctx, suggestion)
    await noteApproved(
      ctx,
      suggestion.authorId,
      bucketForSuggestionKind(suggestion.kind)
    )
  }

  await ctx.db.patch("placeSuggestions", suggestion._id, {
    status: approve ? "approved" : "rejected",
    rejectionComment: approve ? undefined : comment?.trim() || undefined,
    moderatedBy: adminId,
    moderatedAt: Date.now(),
  })
}

async function applySuggestion(
  ctx: MutationCtx,
  suggestion: Doc<"placeSuggestions">
) {
  const place = await ctx.db.get("places", suggestion.placeId)
  if (!place) {
    throw new Error("Place not found")
  }

  if (suggestion.kind === "name" && suggestion.text) {
    await ctx.db.patch("places", place._id, {
      name: suggestion.text,
      updatedAt: Date.now(),
    })
    return
  }

  if (suggestion.kind === "description" && suggestion.text) {
    await ctx.db.patch("places", place._id, {
      description: suggestion.text,
      updatedAt: Date.now(),
    })
    return
  }

  if (suggestion.kind === "location") {
    const geometry = validateGeometry(
      suggestion.geometryType ?? "point",
      suggestion.lat !== undefined && suggestion.lng !== undefined
        ? { lat: suggestion.lat, lng: suggestion.lng }
        : undefined,
      suggestion.boundary
    )
    await ctx.db.patch("places", place._id, {
      lat: geometry.lat,
      lng: geometry.lng,
      geometryType: suggestion.geometryType ?? "point",
      boundary: geometry.boundary,
      updatedAt: Date.now(),
    })
    return
  }

  if (suggestion.kind === "label" && suggestion.text) {
    const labelId = await ensureSuggestedLabel(
      ctx,
      suggestion.text,
      normalizePlaceCategory(place.category),
      suggestion.authorId
    )
    const labelIds = place.labelIds ?? []
    if (!labelIds.includes(labelId)) {
      await ctx.db.patch("places", place._id, {
        labelIds: [...labelIds, labelId],
        updatedAt: Date.now(),
      })
    }
    return
  }

  if (
    suggestion.kind === "translation" &&
    suggestion.text &&
    suggestion.locale &&
    suggestion.translationField
  ) {
    await savePlaceTranslation(ctx, {
      placeId: place._id,
      locale: suggestion.locale,
      field: suggestion.translationField,
      value: suggestion.text,
      authorId: suggestion.authorId,
    })
  }
}

async function ensureSuggestedLabel(
  ctx: MutationCtx,
  name: string,
  category: ReturnType<typeof normalizePlaceCategory>,
  authorId: Id<"users">
) {
  const slugBase = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  const slug = slugBase.length > 0 ? slugBase : `label-${Date.now()}`

  const existing = await ctx.db
    .query("labels")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .unique()

  if (existing) {
    return existing._id
  }

  return await ctx.db.insert("labels", {
    slug,
    name,
    category,
    createdBy: authorId,
    createdAt: Date.now(),
  })
}

export async function savePlaceTranslation(
  ctx: MutationCtx,
  args: {
    placeId: Id<"places">
    locale: Locale
    field: "name" | "description"
    value: string
    authorId: Id<"users">
  }
) {
  const entityType = args.field === "name" ? "placeName" : "placeDescription"
  const entityKey = args.placeId
  const existing = await ctx.db
    .query("translations")
    .withIndex("by_entity", (q) =>
      q
        .eq("entityType", entityType)
        .eq("entityKey", entityKey)
        .eq("locale", args.locale)
    )
    .collect()

  const now = Date.now()
  for (const entry of existing) {
    if (entry.status === "approved") {
      await ctx.db.patch("translations", entry._id, {
        status: "superseded",
        moderatedAt: now,
      })
    }
  }

  await ctx.db.insert("translations", {
    entityType,
    entityKey,
    locale: args.locale,
    value: args.value,
    status: "approved",
    createdBy: args.authorId,
    createdAt: now,
  })
}
