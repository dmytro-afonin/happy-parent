import { v } from "convex/values";
import { query } from "./_generated/server";
import { assertMcpRoleProof } from "./lib/mcpRoleSignature";

/**
 * Public so the Next.js MCP route can call it without a Convex deploy key.
 * The route sends the Clerk user id from a verified OAuth token, plus a
 * short-lived HMAC (`MCP_ROLE_SECRET` on this deployment). The OAuth bearer
 * is not an argument. A missing secret or a bad proof fails closed.
 */
export const roleForClerkUser = query({
  args: {
    clerkUserId: v.string(),
    expiresAt: v.number(),
    signature: v.string(),
  },
  handler: async (ctx, args) => {
    await assertMcpRoleProof(args);
    const issuer = process.env.CLERK_FRONTEND_API_URL?.trim() ?? "";
    if (!issuer) throw new Error("CLERK_FRONTEND_API_URL is not set");
    if (issuer.endsWith("/")) {
      throw new Error("CLERK_FRONTEND_API_URL must not have a trailing slash");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", `${issuer}|${args.clerkUserId}`),
      )
      .unique();

    if (!user) return { role: null };
    return { role: user.role };
  },
});
