import type { QueryCtx, MutationCtx } from "../_generated/server"

type AuthCtx = QueryCtx | MutationCtx

export async function getAuthUserId(ctx: AuthCtx) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    return null
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique()

  return user?._id ?? null
}

export async function requireAuthUserId(ctx: AuthCtx) {
  const userId = await getAuthUserId(ctx)
  if (!userId) {
    throw new Error("Not authenticated")
  }
  return userId
}
