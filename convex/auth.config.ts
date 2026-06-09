// Replace CLERK_JWT_ISSUER_DOMAIN with your Clerk Frontend API URL
// (Clerk Dashboard → JWT Templates → convex → Issuer).
export default {
  providers: [
    {
      domain: process.env.CLERK_FRONTEND_API_URL!,
      applicationID: "convex",
    },
  ],
}
