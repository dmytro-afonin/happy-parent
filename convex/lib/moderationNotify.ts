import type { MutationCtx } from "../_generated/server"
import type { Id } from "../_generated/dataModel"
import { internal } from "../_generated/api"

/** Minimum gap between moderation emails for one submitter. */
export const MODERATION_NOTIFY_COOLDOWN_MS = 5 * 60 * 1000

/**
 * Schedules a moderation email unless this user was notified recently.
 * Pending items are still created; only the email is throttled.
 */
export async function scheduleModerationNotify(
  ctx: MutationCtx,
  userId: Id<"users">,
  args: {
    kind: "place" | "photo" | "comment" | "translation"
    summary: string
    submitterName?: string
  }
) {
  const user = await ctx.db.get("users", userId)
  if (!user) {
    return
  }

  const now = Date.now()
  const last = user.lastModerationNotifyAt ?? 0
  if (now - last < MODERATION_NOTIFY_COOLDOWN_MS) {
    return
  }

  await ctx.db.patch("users", userId, { lastModerationNotifyAt: now })
  await ctx.scheduler.runAfter(0, internal.emails.notifyModerationRequest, {
    kind: args.kind,
    summary: args.summary,
    submitterName: args.submitterName ?? user.name ?? user.email,
  })
}
