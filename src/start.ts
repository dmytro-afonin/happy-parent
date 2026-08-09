import { clerkMiddleware } from "@clerk/tanstack-react-start/server"
import { createCsrfMiddleware, createStart } from "@tanstack/react-start"
import { aliasClerkEnv } from "@/lib/clerk-env"

// Marketplace sets NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY; SDK expects VITE_/CLERK_.
aliasClerkEnv()

const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
})

export const startInstance = createStart(() => {
  return {
    requestMiddleware: [csrfMiddleware, clerkMiddleware()],
  }
})
