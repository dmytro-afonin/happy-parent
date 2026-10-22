import type { AuthConfig } from "convex/server";

export default {
  providers: [
    {
      // Set on the Convex deployment:
      //   pnpm dlx convex env set CLERK_FRONTEND_API_URL "$CLERK_FRONTEND_API_URL"
      domain: process.env.CLERK_FRONTEND_API_URL!,
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
