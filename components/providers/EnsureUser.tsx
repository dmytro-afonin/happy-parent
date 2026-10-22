"use client";

import { useConvexAuth, useMutation } from "convex/react";
import { useEffect } from "react";
import { api } from "@/convex/_generated/api";

/** First authenticated call upserts a users row. */
export function EnsureUser() {
  const { isAuthenticated } = useConvexAuth();
  const ensure = useMutation(api.users.ensure);

  useEffect(() => {
    if (!isAuthenticated) return;
    void ensure({});
  }, [isAuthenticated, ensure]);

  return null;
}
