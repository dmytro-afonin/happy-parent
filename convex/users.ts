import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

async function upsertFromIdentity(
  ctx: MutationCtx,
): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }

  const existing = await ctx.db
    .query("users")
    .withIndex("by_token", (q) =>
      q.eq("tokenIdentifier", identity.tokenIdentifier),
    )
    .unique();

  const name = identity.name ?? undefined;
  const email = identity.email ?? undefined;

  if (existing) {
    await ctx.db.patch(existing._id, { name, email });
    return { ...existing, name, email };
  }

  const id = await ctx.db.insert("users", {
    tokenIdentifier: identity.tokenIdentifier,
    name,
    email,
    role: "user",
  });
  const created = await ctx.db.get(id);
  return created;
}

/** First authenticated call upserts the users row. */
export const ensure = mutation({
  args: {},
  handler: async (ctx) => {
    return await upsertFromIdentity(ctx);
  },
});

export const me = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    return await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
  },
});

export async function requireUser(
  ctx: MutationCtx,
): Promise<{ user: Doc<"users">; userId: Id<"users"> }> {
  const user = await upsertFromIdentity(ctx);
  if (!user) {
    throw new Error("Sign in required");
  }
  return { user, userId: user._id };
}

export async function requireAdmin(ctx: MutationCtx): Promise<Doc<"users">> {
  const { user } = await requireUser(ctx);
  if (user.role !== "admin") {
    throw new Error("Admin required");
  }
  return user;
}
