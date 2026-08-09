"use client"

import { useEffect } from "react"
import { useConvexAuth, useMutation, useQuery } from "convex/react"

import { api } from "../../convex/_generated/api"

export function useAdminStatus() {
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth()
  const ensureCurrentUser = useMutation(api.users.ensureCurrentUser)
  const adminStatus = useQuery(
    api.users.getAdminStatus,
    isAuthenticated ? {} : "skip"
  )

  useEffect(() => {
    if (isAuthenticated) {
      void ensureCurrentUser()
    }
  }, [ensureCurrentUser, isAuthenticated])

  const isLoading =
    isAuthLoading || (isAuthenticated && adminStatus === undefined)

  // Require an authenticated session AND an explicit true from the server.
  // Never treat a cached query result as admin after sign-out.
  const isAdmin = isAuthenticated && !isLoading && adminStatus?.isAdmin === true

  return {
    isAdmin,
    isLoading,
  }
}
