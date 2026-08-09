import { mutation, query } from "./_generated/server"
import { v } from "convex/values"

import { getAuthUserId } from "./lib/auth"
import { sidePanelSectionValidator } from "./lib/mapPreferenceFields"
import { DEFAULT_MAP_STYLE_ID, mapStyleIdValidator } from "./lib/mapStyles"
import {
  PLACE_CATEGORIES,
  normalizePlaceCategory,
  placeCategoryValidator,
} from "./lib/placeCategories"
import { ensureAuthUser, getAuthUser } from "./lib/users"

const mapPreferencesReturnValidator = v.object({
  mapStyleId: mapStyleIdValidator,
  activeCategories: v.array(placeCategoryValidator),
  sidePanelSection: sidePanelSectionValidator,
  sidebarOpen: v.boolean(),
})

function normalizeActiveCategories(categories: string[] | undefined) {
  if (categories === undefined) {
    return [...PLACE_CATEGORIES]
  }

  // Legacy specific categories (playground, cafe, …) map onto the new generic
  // ones so previously saved preferences keep working.
  return [
    ...new Set(categories.map((category) => normalizePlaceCategory(category))),
  ]
}

export const getPreferences = query({
  args: {},
  returns: v.union(mapPreferencesReturnValidator, v.null()),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      return {
        mapStyleId: DEFAULT_MAP_STYLE_ID,
        activeCategories: [...PLACE_CATEGORIES],
        sidePanelSection: "categories" as const,
        sidebarOpen: true,
      }
    }

    const user = await getAuthUser(ctx)
    if (!user) {
      return null
    }

    return {
      mapStyleId: user.mapStyleId ?? DEFAULT_MAP_STYLE_ID,
      activeCategories: normalizeActiveCategories(user.activeCategories),
      sidePanelSection: user.sidePanelSection ?? "categories",
      sidebarOpen: user.sidebarOpen ?? true,
    }
  },
})

/** @deprecated Use getPreferences */
export const getMapStyle = query({
  args: {},
  returns: v.union(mapStyleIdValidator, v.null()),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      return null
    }

    const user = await ctx.db.get("users", userId)
    if (!user) {
      return null
    }

    return user.mapStyleId ?? DEFAULT_MAP_STYLE_ID
  },
})

export const updatePreferences = mutation({
  args: {
    mapStyleId: v.optional(mapStyleIdValidator),
    activeCategories: v.optional(v.array(placeCategoryValidator)),
    sidePanelSection: v.optional(sidePanelSectionValidator),
    sidebarOpen: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await ensureAuthUser(ctx)

    await ctx.db.patch("users", userId, {
      ...(args.mapStyleId !== undefined ? { mapStyleId: args.mapStyleId } : {}),
      ...(args.activeCategories !== undefined
        ? { activeCategories: args.activeCategories }
        : {}),
      ...(args.sidePanelSection !== undefined
        ? { sidePanelSection: args.sidePanelSection }
        : {}),
      ...(args.sidebarOpen !== undefined
        ? { sidebarOpen: args.sidebarOpen }
        : {}),
    })

    return null
  },
})

/** @deprecated Use updatePreferences */
export const setMapStyle = mutation({
  args: {
    mapStyleId: mapStyleIdValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await ensureAuthUser(ctx)
    await ctx.db.patch("users", userId, { mapStyleId: args.mapStyleId })
    return null
  },
})
