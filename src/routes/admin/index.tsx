"use client"

import { Link, createFileRoute } from "@tanstack/react-router"
import { useQuery } from "convex/react"
import {
  ArrowRightIcon,
  LanguagesIcon,
  MapPinIcon,
  ShieldCheckIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useI18n } from "@/lib/i18n"
import { api } from "../../../convex/_generated/api"

export const Route = createFileRoute("/admin/")({
  component: AdminDashboardPage,
})

function AdminDashboardPage() {
  const { t } = useI18n()
  const pending = useQuery(api.moderation.listPending, {})
  const places = useQuery(api.places.listAllAdmin, {})

  const pendingPlaces = pending?.places.length ?? 0
  const pendingPhotos = pending?.photos.length ?? 0
  const pendingComments = pending?.comments.length ?? 0
  const pendingTranslations = pending?.translations.length ?? 0
  const approvalTotal = pendingPlaces + pendingPhotos + pendingComments
  const placesTotal = places?.length

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("admin.dashboard.title")}
        </h1>
        <p className="text-muted-foreground">{t("admin.dashboard.subtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title={t("admin.dashboard.awaitingApproval")}
          value={pending === undefined ? "…" : String(approvalTotal)}
          detail={
            pending === undefined
              ? t("common.loading")
              : approvalTotal === 0
                ? t("admin.dashboard.emptyQueue")
                : `${pendingPlaces} ${t("admin.dashboard.pendingPlaces")} · ${pendingPhotos} ${t("admin.dashboard.pendingPhotos")} · ${pendingComments} ${t("admin.dashboard.pendingComments")}`
          }
          icon={<ShieldCheckIcon className="size-5" />}
        />
        <StatCard
          title={t("admin.dashboard.awaitingTranslations")}
          value={pending === undefined ? "…" : String(pendingTranslations)}
          detail={
            pending === undefined
              ? t("common.loading")
              : pendingTranslations === 0
                ? t("admin.dashboard.emptyQueue")
                : `${pendingTranslations} ${t("admin.dashboard.pendingTranslations")}`
          }
          icon={<LanguagesIcon className="size-5" />}
        />
        <StatCard
          title={t("admin.dashboard.placesTotal")}
          value={placesTotal === undefined ? "…" : String(placesTotal)}
          detail={t("admin.dashboard.managePlaces")}
          icon={<MapPinIcon className="size-5" />}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <CtaCard
          to="/admin/moderation"
          title={t("admin.dashboard.reviewQueue")}
          badge={approvalTotal > 0 ? String(approvalTotal) : undefined}
        />
        <CtaCard
          to="/admin/translations"
          title={t("admin.dashboard.manageTranslations")}
          badge={
            pendingTranslations > 0 ? String(pendingTranslations) : undefined
          }
        />
        <CtaCard to="/admin/places" title={t("admin.dashboard.managePlaces")} />
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  detail,
  icon,
}: {
  title: string
  value: string
  detail: string
  icon: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <span className="text-muted-foreground">{icon}</span>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tracking-tight">{value}</p>
        <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  )
}

function CtaCard({
  to,
  title,
  badge,
}: {
  to: "/admin/places" | "/admin/moderation" | "/admin/translations"
  title: string
  badge?: string
}) {
  return (
    <Button
      asChild
      variant="outline"
      className="h-auto justify-between px-4 py-4 text-left whitespace-normal"
    >
      <Link to={to}>
        <span className="flex flex-col items-start gap-1">
          <span className="font-medium">{title}</span>
          {badge ? (
            <span className="text-xs text-muted-foreground">{badge}</span>
          ) : null}
        </span>
        <ArrowRightIcon className="size-4 shrink-0" />
      </Link>
    </Button>
  )
}
