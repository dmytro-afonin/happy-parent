/**
 * Vercel Marketplace Clerk syncs Next.js-style names:
 *   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY
 *
 * @clerk/tanstack-react-start reads Vite/generic names:
 *   VITE_CLERK_PUBLISHABLE_KEY || CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY
 *
 * Map the Marketplace publishable key onto the names this SDK expects so
 * manual VITE_CLERK_PUBLISHABLE_KEY on Vercel is optional.
 */
export function aliasClerkEnv(
  env: Record<string, string | undefined> = process.env
): string {
  const publishable =
    env.VITE_CLERK_PUBLISHABLE_KEY ||
    env.CLERK_PUBLISHABLE_KEY ||
    env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

  if (publishable) {
    env.VITE_CLERK_PUBLISHABLE_KEY ??= publishable
    env.CLERK_PUBLISHABLE_KEY ??= publishable
  }

  return publishable ?? ""
}
