import { v } from "convex/values"

import { internalAction, internalQuery } from "./_generated/server"
import { internal } from "./_generated/api"
import { isAdminRole } from "./lib/roles"

const RESEND_API_URL = "https://api.resend.com/emails"
const DEFAULT_FROM = "Happy Parent <onboarding@resend.dev>"

export const getAdminEmails = internalQuery({
  args: {},
  returns: v.array(v.string()),
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect()
    return users
      .filter((user) => isAdminRole(user.role) && user.email)
      .map((user) => user.email as string)
  },
})

/**
 * Notifies admins by email whenever a new moderation request is created
 * (place, photo, comment or translation submitted by a regular user).
 *
 * Requires `RESEND_API_KEY` on the Convex deployment. Optional:
 * `RESEND_FROM_EMAIL` (sender) and `MODERATION_NOTIFY_EMAILS`
 * (comma-separated recipients overriding admin user emails).
 */
export const notifyModerationRequest = internalAction({
  args: {
    kind: v.union(
      v.literal("place"),
      v.literal("photo"),
      v.literal("comment"),
      v.literal("translation")
    ),
    summary: v.string(),
    submitterName: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      console.warn(
        "RESEND_API_KEY is not set on the Convex deployment — skipping moderation email."
      )
      return null
    }

    const override = process.env.MODERATION_NOTIFY_EMAILS
    const recipients = override
      ? override
          .split(",")
          .map((email) => email.trim())
          .filter(Boolean)
      : await ctx.runQuery(internal.emails.getAdminEmails, {})

    if (recipients.length === 0) {
      console.warn("No admin recipients found — skipping moderation email.")
      return null
    }

    const submitter = args.submitterName ?? "A user"
    const subject = `[Happy Parent] New ${args.kind} awaiting moderation`
    const html = `
      <p>${escapeHtml(submitter)} submitted a new <strong>${args.kind}</strong> for review:</p>
      <blockquote>${escapeHtml(args.summary)}</blockquote>
      <p>Open the admin moderation queue to approve or reject it.</p>
    `

    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL ?? DEFAULT_FROM,
        to: recipients,
        subject,
        html,
      }),
    })

    if (!response.ok) {
      const body = await response.text()
      console.error("Resend request failed:", response.status, body)
    }

    return null
  },
})

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}
