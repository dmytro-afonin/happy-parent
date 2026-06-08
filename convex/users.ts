import { mutation, query } from "./_generated/server"
import { v } from "convex/values"

import { isAdminRole, userRoleValidator } from "./lib/roles"
import { ensureAuthUser, getAuthUser } from "./lib/users"

const currentUserValidator = v.union(
  v.null(),
  v.object({
    _id: v.id("users"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    role: userRoleValidator,
    isAdmin: v.boolean(),
  }),
)

export const getCurrent = query({
  args: {},
  returns: currentUserValidator,
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      return null
    }

    const user = await getAuthUser(ctx)
    if (!user) {
      return null
    }

    const role = user.role ?? "user"

    return {
      _id: user._id,
      name: user.name ?? identity.name,
      email: user.email ?? identity.email,
      role,
      isAdmin: isAdminRole(role),
    }
  },
})

export const getAdminStatus = query({
  args: {},
  returns: v.object({
    isAdmin: v.boolean(),
  }),
  handler: async (ctx) => {
    const user = await getAuthUser(ctx)

    return {
      isAdmin: isAdminRole(user?.role),
    }
  },
})

export const ensureCurrentUser = mutation({
  args: {},
  returns: v.id("users"),
  handler: async (ctx) => {
    return await ensureAuthUser(ctx)
  },
})
