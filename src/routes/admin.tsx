"use client"

import { Link, Outlet, createFileRoute } from "@tanstack/react-router"
import { Show, SignInButton } from "@clerk/react"
import { useConvexAuth } from "convex/react"

import { AdminShell } from "@/components/admin/AdminShell"
import { Button } from "@/components/ui/button"
import { useAdminStatus } from "@/hooks/use-admin-status"
import { useI18n } from "@/lib/i18n"

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
})

function AdminLayout() {
  const { t } = useI18n()
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth()
  const { isAdmin, isLoading: isAdminLoading } = useAdminStatus()

  if (isAuthLoading || isAdminLoading) {
    return (
      <main className="container mx-auto max-w-5xl px-4 py-8">
        <p className="text-muted-foreground">{t("admin.loading")}</p>
      </main>
    )
  }

  if (!isAuthenticated) {
    return (
      <main className="container mx-auto max-w-5xl px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">{t("admin.signInTitle")}</h1>
        <p className="mt-2 text-muted-foreground">{t("admin.signInHint")}</p>
        <Show when="signed-out">
          <SignInButton mode="modal">
            <Button className="mt-4">{t("auth.signIn")}</Button>
          </SignInButton>
        </Show>
      </main>
    )
  }

  if (!isAdmin) {
    return (
      <main className="container mx-auto max-w-5xl px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">{t("admin.deniedTitle")}</h1>
        <p className="mt-2 text-muted-foreground">{t("admin.deniedHint")}</p>
        <Button className="mt-4" asChild>
          <Link to="/map">{t("admin.goToMap")}</Link>
        </Button>
      </main>
    )
  }

  return (
    <AdminShell>
      <Outlet />
    </AdminShell>
  )
}
