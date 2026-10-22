"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";
import { EnsureUser } from "@/components/providers/EnsureUser";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

function ConvexTree({ children }: { children: ReactNode }) {
  if (!convex) {
    return <>{children}</>;
  }
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      <EnsureUser />
      {children}
    </ConvexProviderWithClerk>
  );
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider>
      <ConvexTree>{children}</ConvexTree>
    </ClerkProvider>
  );
}
