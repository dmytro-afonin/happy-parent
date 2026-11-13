import { v } from "convex/values";
import { mutation } from "./_generated/server";
import {
  GEOCODE_COOKIE_TTL_MS,
  GEOCODE_SESSION_ID_RE,
  GEOCODE_WINDOW_MS,
  geocodeLimitForTier,
  geocodeSignaturePayload,
  geocodeSignaturesMatch,
} from "./lib/geocodeSignature";

/**
 * Public so the Next.js geocode route can call it without an admin key.
 * Writes are authorized by the `hp_geo` HMAC (`GEOCODE_PROXY_SECRET` on this
 * deployment). A missing secret or a bad signature fails closed.
 */
export const consume = mutation({
  args: {
    sessionId: v.string(),
    expiresAt: v.number(),
    signature: v.string(),
    tier: v.union(v.literal("guest"), v.literal("user")),
  },
  handler: async (ctx, args) => {
    await assertSignedSession(args.sessionId, args.expiresAt, args.signature);
    const limit = geocodeLimitForTier(args.tier);
    const now = Date.now();

    const existing = await ctx.db
      .query("geocodeSessions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    if (!existing || now - existing.windowStart >= GEOCODE_WINDOW_MS) {
      if (existing) {
        await ctx.db.patch(existing._id, { count: 1, windowStart: now });
      } else {
        await ctx.db.insert("geocodeSessions", {
          sessionId: args.sessionId,
          count: 1,
          windowStart: now,
        });
      }
      return {
        allowed: true,
        limit,
        remaining: limit - 1,
        retryAfterMs: GEOCODE_WINDOW_MS,
      };
    }

    if (existing.count >= limit) {
      return {
        allowed: false,
        limit,
        remaining: 0,
        retryAfterMs: Math.max(0, existing.windowStart + GEOCODE_WINDOW_MS - now),
      };
    }

    const count = existing.count + 1;
    await ctx.db.patch(existing._id, { count });
    return {
      allowed: true,
      limit,
      remaining: limit - count,
      retryAfterMs: Math.max(0, existing.windowStart + GEOCODE_WINDOW_MS - now),
    };
  },
});

async function assertSignedSession(
  sessionId: string,
  expiresAt: number,
  signature: string,
) {
  const secret = process.env.GEOCODE_PROXY_SECRET?.trim() ?? "";
  if (!secret) {
    throw new Error("GEOCODE_PROXY_SECRET is not set");
  }
  if (!GEOCODE_SESSION_ID_RE.test(sessionId) || !Number.isSafeInteger(expiresAt)) {
    throw new Error("Invalid geocode session");
  }
  const now = Date.now();
  // Five minutes of clock slack. Still rejects a signature whose expiry is
  // longer than the cookie TTL.
  if (expiresAt < now || expiresAt > now + GEOCODE_COOKIE_TTL_MS + 5 * 60_000) {
    throw new Error("Invalid geocode session");
  }
  const payload = geocodeSignaturePayload(sessionId, expiresAt);
  const ok = await geocodeSignaturesMatch(secret, payload, signature);
  if (!ok) throw new Error("Invalid geocode session");
}
