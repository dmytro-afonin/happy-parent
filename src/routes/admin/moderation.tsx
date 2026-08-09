"use client"

import { createFileRoute } from "@tanstack/react-router"

import { ModerationQueue } from "@/components/admin/ModerationQueue"
import { useI18n } from "@/lib/i18n"

export const Route = createFileRoute("/admin/moderation")({
  component: AdminModerationPage,
})

function AdminModerationPage() {
  const { t } = useI18n()

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("admin.moderation.title")}
        </h1>
        <p className="text-muted-foreground">
          {t("admin.moderation.subtitle")}
        </p>
      </div>
      <ModerationQueue />
    </div>
  )
}
