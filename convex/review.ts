import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import type { Doc, Id } from "./_generated/dataModel"
import type { QueryCtx } from "./_generated/server"

import { geometryTypeValidator } from "./lib/geometry"
import { SUPPORTED_LOCALES, localeValidator } from "./lib/locales"
import type { Locale } from "./lib/locales"
import {
  normalizePlaceCategory,
  placeCategoryValidator,
} from "./lib/placeCategories"
import { requireAdminUser } from "./lib/users"
import { savePlaceTranslation } from "./placeSuggestions"

const QUEUE_LIMIT = 40

const personValidator = v.object({
  userId: v.id("users"),
  name: v.optional(v.string()),
  email: v.optional(v.string()),
  registeredAt: v.number(),
  placesRequested: v.number(),
  placesApproved: v.number(),
  changesRequested: v.number(),
  changesApproved: v.number(),
  titleChangesRequested: v.number(),
  titleChangesApproved: v.number(),
  descriptionChangesRequested: v.number(),
  descriptionChangesApproved: v.number(),
  locationChangesRequested: v.number(),
  locationChangesApproved: v.number(),
  photoChangesRequested: v.number(),
  photoChangesApproved: v.number(),
  commentsRequested: v.number(),
  commentsApproved: v.number(),
})

const textChangeValidator = v.object({
  id: v.id("placeSuggestions"),
  text: v.string(),
  submitter: personValidator,
})

const reviewPlaceValidator = v.object({
  placeId: v.id("places"),
  isNew: v.boolean(),
  name: v.string(),
  description: v.optional(v.string()),
  address: v.optional(v.string()),
  lat: v.number(),
  lng: v.number(),
  geometryType: v.optional(geometryTypeValidator),
  category: placeCategoryValidator,
  labelNames: v.array(v.string()),
  savedDescription: v.optional(v.string()),
  nameChanges: v.array(textChangeValidator),
  descriptionChanges: v.array(textChangeValidator),
  locationChanges: v.array(textChangeValidator),
  labelChanges: v.array(textChangeValidator),
  translationChanges: v.array(
    v.object({
      id: v.id("placeSuggestions"),
      locale: localeValidator,
      field: v.union(v.literal("name"), v.literal("description")),
      text: v.string(),
      submitter: personValidator,
    })
  ),
  photos: v.array(
    v.object({
      id: v.id("photos"),
      url: v.string(),
      thumbnailUrl: v.optional(v.string()),
      pending: v.boolean(),
      submitter: personValidator,
    })
  ),
  comments: v.array(
    v.object({
      id: v.id("placeComments"),
      text: v.string(),
      submitter: personValidator,
    })
  ),
  presentTranslations: v.array(
    v.object({
      locale: localeValidator,
      name: v.optional(v.string()),
      description: v.optional(v.string()),
    })
  ),
  missingLocales: v.array(localeValidator),
})

type Person = {
  userId: Id<"users">
  name?: string
  email?: string
  registeredAt: number
  placesRequested: number
  placesApproved: number
  changesRequested: number
  changesApproved: number
  titleChangesRequested: number
  titleChangesApproved: number
  descriptionChangesRequested: number
  descriptionChangesApproved: number
  locationChangesRequested: number
  locationChangesApproved: number
  photoChangesRequested: number
  photoChangesApproved: number
  commentsRequested: number
  commentsApproved: number
}

function emptyPerson(userId: Id<"users">): Person {
  return {
    userId,
    registeredAt: 0,
    placesRequested: 0,
    placesApproved: 0,
    changesRequested: 0,
    changesApproved: 0,
    titleChangesRequested: 0,
    titleChangesApproved: 0,
    descriptionChangesRequested: 0,
    descriptionChangesApproved: 0,
    locationChangesRequested: 0,
    locationChangesApproved: 0,
    photoChangesRequested: 0,
    photoChangesApproved: 0,
    commentsRequested: 0,
    commentsApproved: 0,
  }
}

async function loadPerson(
  ctx: QueryCtx,
  cache: Map<Id<"users">, Person>,
  userId: Id<"users">
) {
  const cached = cache.get(userId)
  if (cached) {
    return cached
  }
  const user = await ctx.db.get("users", userId)
  const person: Person = user
    ? {
        userId,
        name: user.name,
        email: user.email,
        registeredAt: user._creationTime,
        placesRequested: user.placesRequested ?? 0,
        placesApproved: user.placesApproved ?? 0,
        changesRequested: user.changesRequested ?? 0,
        changesApproved: user.changesApproved ?? 0,
        titleChangesRequested: user.titleChangesRequested ?? 0,
        titleChangesApproved: user.titleChangesApproved ?? 0,
        descriptionChangesRequested: user.descriptionChangesRequested ?? 0,
        descriptionChangesApproved: user.descriptionChangesApproved ?? 0,
        locationChangesRequested: user.locationChangesRequested ?? 0,
        locationChangesApproved: user.locationChangesApproved ?? 0,
        photoChangesRequested: user.photoChangesRequested ?? 0,
        photoChangesApproved: user.photoChangesApproved ?? 0,
        commentsRequested: user.commentsRequested ?? 0,
        commentsApproved: user.commentsApproved ?? 0,
      }
    : emptyPerson(userId)
  cache.set(userId, person)
  return person
}

async function translationState(ctx: QueryCtx, place: Doc<"places">) {
  const [names, descriptions] = await Promise.all([
    ctx.db
      .query("translations")
      .withIndex("by_entity", (q) =>
        q.eq("entityType", "placeName").eq("entityKey", place._id)
      )
      .collect(),
    ctx.db
      .query("translations")
      .withIndex("by_entity", (q) =>
        q.eq("entityType", "placeDescription").eq("entityKey", place._id)
      )
      .collect(),
  ])

  const present = new Map<Locale, { name?: string; description?: string }>()
  for (const entry of names) {
    if (entry.status === "approved") {
      present.set(entry.locale, {
        ...present.get(entry.locale),
        name: entry.value,
      })
    }
  }
  for (const entry of descriptions) {
    if (entry.status === "approved") {
      present.set(entry.locale, {
        ...present.get(entry.locale),
        description: entry.value,
      })
    }
  }

  const approvedNameLocales = new Set(
    names
      .filter((entry) => entry.status === "approved")
      .map((entry) => entry.locale)
  )
  const missingLocales = SUPPORTED_LOCALES.filter(
    (locale) =>
      locale !== place.sourceLocale && !approvedNameLocales.has(locale)
  )

  return {
    presentTranslations: [...present.entries()].map(([locale, value]) => ({
      locale,
      name: value.name,
      description: value.description,
    })),
    missingLocales,
  }
}

export const counts = query({
  args: {},
  returns: v.object({
    updates: v.number(),
    untranslated: v.number(),
  }),
  handler: async (ctx) => {
    await requireAdminUser(ctx)

    const [places, photos, comments, suggestions, approved] = await Promise.all(
      [
        ctx.db
          .query("places")
          .withIndex("by_status", (q) => q.eq("status", "pending"))
          .take(QUEUE_LIMIT),
        ctx.db
          .query("photos")
          .withIndex("by_status", (q) => q.eq("status", "pending"))
          .take(QUEUE_LIMIT),
        ctx.db
          .query("placeComments")
          .withIndex("by_status", (q) => q.eq("status", "pending"))
          .take(QUEUE_LIMIT),
        ctx.db
          .query("placeSuggestions")
          .withIndex("by_status", (q) => q.eq("status", "pending"))
          .take(QUEUE_LIMIT),
        ctx.db
          .query("places")
          .withIndex("by_status", (q) => q.eq("status", "approved"))
          .take(200),
      ]
    )

    const updateIds = new Set<string>()
    for (const place of places) updateIds.add(place._id)
    for (const photo of photos) updateIds.add(photo.placeId)
    for (const comment of comments) updateIds.add(comment.placeId)
    for (const suggestion of suggestions) updateIds.add(suggestion.placeId)

    let untranslated = 0
    for (const place of approved) {
      const state = await translationState(ctx, place)
      if (state.missingLocales.length > 0) {
        untranslated += 1
      }
    }

    return { updates: updateIds.size, untranslated }
  },
})

export const list = query({
  args: {
    mode: v.union(v.literal("updates"), v.literal("translations")),
  },
  returns: v.array(reviewPlaceValidator),
  handler: async (ctx, args) => {
    await requireAdminUser(ctx)

    const people = new Map<Id<"users">, Person>()
    const labels = await ctx.db.query("labels").collect()
    const labelNameById = new Map(
      labels.map((label) => [label._id, label.name])
    )

    if (args.mode === "translations") {
      const approved = await ctx.db
        .query("places")
        .withIndex("by_status", (q) => q.eq("status", "approved"))
        .take(200)

      const items = []
      for (const place of approved) {
        const built = await buildPlace(ctx, place, people, labelNameById, {
          suggestions: [],
          photos: [],
          comments: [],
        })
        if (built.missingLocales.length > 0) {
          items.push(built)
        }
        if (items.length >= QUEUE_LIMIT) {
          break
        }
      }
      return items
    }

    const [pendingPlaces, pendingPhotos, pendingComments, pendingSuggestions] =
      await Promise.all([
        ctx.db
          .query("places")
          .withIndex("by_status", (q) => q.eq("status", "pending"))
          .take(QUEUE_LIMIT),
        ctx.db
          .query("photos")
          .withIndex("by_status", (q) => q.eq("status", "pending"))
          .take(QUEUE_LIMIT),
        ctx.db
          .query("placeComments")
          .withIndex("by_status", (q) => q.eq("status", "pending"))
          .take(QUEUE_LIMIT),
        ctx.db
          .query("placeSuggestions")
          .withIndex("by_status", (q) => q.eq("status", "pending"))
          .take(QUEUE_LIMIT),
      ])

    const placeIds = new Set<Id<"places">>()
    for (const place of pendingPlaces) placeIds.add(place._id)
    for (const photo of pendingPhotos) placeIds.add(photo.placeId)
    for (const comment of pendingComments) placeIds.add(comment.placeId)
    for (const suggestion of pendingSuggestions)
      placeIds.add(suggestion.placeId)

    const items = []
    for (const placeId of placeIds) {
      const place = await ctx.db.get("places", placeId)
      if (!place) {
        continue
      }
      const [photos, comments, suggestions] = await Promise.all([
        ctx.db
          .query("photos")
          .withIndex("by_place", (q) => q.eq("placeId", placeId))
          .collect(),
        ctx.db
          .query("placeComments")
          .withIndex("by_place", (q) => q.eq("placeId", placeId))
          .collect(),
        ctx.db
          .query("placeSuggestions")
          .withIndex("by_place", (q) => q.eq("placeId", placeId))
          .collect(),
      ])
      items.push(
        await buildPlace(ctx, place, people, labelNameById, {
          photos,
          comments: comments.filter((comment) => comment.status === "pending"),
          suggestions: suggestions.filter(
            (suggestion) => suggestion.status === "pending"
          ),
        })
      )
    }

    items.sort((left, right) => {
      if (left.isNew !== right.isNew) {
        return left.isNew ? -1 : 1
      }
      return left.name.localeCompare(right.name)
    })
    return items
  },
})

async function buildPlace(
  ctx: QueryCtx,
  place: Doc<"places">,
  people: Map<Id<"users">, Person>,
  labelNameById: Map<Id<"labels">, string>,
  pending: {
    photos: Doc<"photos">[]
    comments: Doc<"placeComments">[]
    suggestions: Doc<"placeSuggestions">[]
  }
) {
  const translations = await translationState(ctx, place)
  const nameChanges = []
  const descriptionChanges = []
  const locationChanges = []
  const labelChanges = []
  const translationChanges = []

  for (const suggestion of pending.suggestions) {
    const submitter = await loadPerson(ctx, people, suggestion.authorId)
    if (suggestion.kind === "name" && suggestion.text) {
      nameChanges.push({ id: suggestion._id, text: suggestion.text, submitter })
    } else if (suggestion.kind === "description" && suggestion.text) {
      descriptionChanges.push({
        id: suggestion._id,
        text: suggestion.text,
        submitter,
      })
    } else if (suggestion.kind === "location") {
      locationChanges.push({
        id: suggestion._id,
        text:
          suggestion.geometryType === "polygon"
            ? `Area (${suggestion.boundary?.length ?? 0} points)`
            : `${suggestion.lat?.toFixed(5) ?? ""}, ${suggestion.lng?.toFixed(5) ?? ""}`,
        submitter,
      })
    } else if (suggestion.kind === "label" && suggestion.text) {
      labelChanges.push({
        id: suggestion._id,
        text: suggestion.text,
        submitter,
      })
    } else if (
      suggestion.kind === "translation" &&
      suggestion.text &&
      suggestion.locale &&
      suggestion.translationField
    ) {
      translationChanges.push({
        id: suggestion._id,
        locale: suggestion.locale,
        field: suggestion.translationField,
        text: suggestion.text,
        submitter,
      })
    }
  }

  const photos = []
  for (const photo of pending.photos) {
    photos.push({
      id: photo._id,
      url: photo.url,
      thumbnailUrl: photo.thumbnailUrl,
      pending: photo.status === "pending",
      submitter: await loadPerson(ctx, people, photo.uploaderId),
    })
  }

  const comments = []
  for (const comment of pending.comments) {
    comments.push({
      id: comment._id,
      text: comment.text,
      submitter: await loadPerson(ctx, people, comment.authorId),
    })
  }

  return {
    placeId: place._id,
    isNew: place.status === "pending",
    name: place.name,
    description: place.description,
    address: place.address,
    lat: place.lat,
    lng: place.lng,
    geometryType: place.geometryType,
    category: normalizePlaceCategory(place.category),
    labelNames: (place.labelIds ?? [])
      .map((labelId) => labelNameById.get(labelId))
      .filter((name): name is string => Boolean(name)),
    savedDescription: place.description,
    nameChanges,
    descriptionChanges,
    locationChanges,
    labelChanges,
    translationChanges,
    photos,
    comments,
    presentTranslations: translations.presentTranslations,
    missingLocales: translations.missingLocales,
  }
}

export const saveTranslation = mutation({
  args: {
    placeId: v.id("places"),
    locale: localeValidator,
    field: v.union(v.literal("name"), v.literal("description")),
    value: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const admin = await requireAdminUser(ctx)
    const place = await ctx.db.get("places", args.placeId)
    if (!place) {
      throw new Error("Place not found")
    }
    const value = args.value.trim()
    if (value.length === 0) {
      throw new Error("Translation cannot be empty")
    }
    await savePlaceTranslation(ctx, {
      placeId: args.placeId,
      locale: args.locale,
      field: args.field,
      value,
      authorId: admin._id,
    })
    return null
  },
})
