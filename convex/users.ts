import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

/** Comma/space-separated emails from Convex env `ADMIN_EMAILS` (local/dev bootstrap). */
function adminEmailSet(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return new Set(
    raw
      .split(/[,;\s]+/)
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

function shouldBeAdmin(email: string | undefined): boolean {
  if (!email) return false;
  return adminEmailSet().has(email.trim().toLowerCase());
}

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
  const promote = shouldBeAdmin(email);

  if (existing) {
    const patch: { name?: string; email?: string; role?: "admin" } = {
      name,
      email,
    };
    // Promote matching emails; never auto-demote.
    if (promote && existing.role !== "admin") {
      patch.role = "admin";
    }
    await ctx.db.patch(existing._id, patch);
    return {
      ...existing,
      name,
      email,
      role: promote ? "admin" : existing.role,
    };
  }

  const id = await ctx.db.insert("users", {
    tokenIdentifier: identity.tokenIdentifier,
    name,
    email,
    role: promote ? "admin" : "user",
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
