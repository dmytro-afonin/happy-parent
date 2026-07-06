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

  return {
    isAdmin: adminStatus?.isAdmin ?? false,
    isLoading: isAuthLoading || (isAuthenticated && adminStatus === undefined),
  }
}
