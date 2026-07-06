import type { MutationCtx, QueryCtx } from "../_generated/server"
import type { Id } from "../_generated/dataModel"

import { isAdminRole } from "./roles"

type AuthCtx = QueryCtx | MutationCtx

export async function getAuthUser(ctx: AuthCtx) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    return null
  }

  return await ctx.db
    .query("users")
    .withIndex("by_token", (q) =>
      q.eq("tokenIdentifier", identity.tokenIdentifier)
    )
    .unique()
}

export async function getAuthUserId(ctx: AuthCtx) {
  const user = await getAuthUser(ctx)
  return user?._id ?? null
}

export async function requireAuthUserId(ctx: AuthCtx) {
  const userId = await getAuthUserId(ctx)
  if (!userId) {
    throw new Error("Not authenticated")
  }
  return userId
}

export async function requireAdminUser(ctx: AuthCtx) {
  const user = await getAuthUser(ctx)
  if (!user) {
    throw new Error("Not authenticated")
  }

  if (!isAdminRole(user.role)) {
    throw new Error("Admin access required")
  }

  return user
}

export async function ensureAuthUser(ctx: MutationCtx): Promise<Id<"users">> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    throw new Error("Not authenticated")
  }

  const existing = await getAuthUser(ctx)

  if (existing) {
    if (identity.email && existing.email !== identity.email) {
      await ctx.db.patch("users", existing._id, { email: identity.email })
    }

    return existing._id
  }

  return await ctx.db.insert("users", {
    tokenIdentifier: identity.tokenIdentifier,
    name: identity.name,
    email: identity.email,
    role: "user",
  })
}
