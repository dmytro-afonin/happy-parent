import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

function splitEnvList(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(/[,;\s]+/)
    .map((e) => e.trim())
    .filter(Boolean);
}

/** Comma/space-separated emails from Convex env `ADMIN_EMAILS` (local/dev bootstrap). */
function adminEmailSet(): Set<string> {
  return new Set(splitEnvList(process.env.ADMIN_EMAILS).map((e) => e.toLowerCase()));
}

/**
 * Clerk user ids (`user_…`) or full tokenIdentifiers from `ADMIN_CLERK_USER_IDS`.
 * Use this when the Convex JWT has no `email` claim (common).
 */
function adminClerkIdSet(): Set<string> {
  return new Set(splitEnvList(process.env.ADMIN_CLERK_USER_IDS));
}

function shouldBeAdmin(identity: {
  email?: string | null;
  emailVerified?: boolean;
  subject?: string | null;
  tokenIdentifier: string;
}): boolean {
  const email = identity.email?.trim().toLowerCase();
  // Require JWT email_verified so an unverified allowlisted address cannot become admin.
  if (
    email &&
    identity.emailVerified === true &&
    adminEmailSet().has(email)
  ) {
    return true;
  }

  const ids = adminClerkIdSet();
  if (ids.size === 0) return false;
  const subject = identity.subject?.trim();
  if (subject && ids.has(subject)) return true;
  for (const id of ids) {
    if (identity.tokenIdentifier === id || identity.tokenIdentifier.endsWith(`|${id}`)) {
      return true;
    }
  }
  return false;
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
  const promote = shouldBeAdmin(identity);

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
