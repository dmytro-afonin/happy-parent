"use client"

import { createFileRoute, Link } from "@tanstack/react-router"
import { useMutation, useQuery } from "convex/react"
import { Trash2Icon } from "lucide-react"

import { AdminLabelForm } from "@/components/admin/AdminLabelForm"
import { AdminPlaceForm } from "@/components/admin/AdminPlaceForm"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useI18n } from "@/lib/i18n"
import { PLACE_CATEGORY_META } from "@/lib/place-categories"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"

export const Route = createFileRoute("/admin/places")({
  component: AdminPlacesPage,
})

function AdminPlacesPage() {
  const { t } = useI18n()
  const places = useQuery(api.places.listAllAdmin, {})
  const removePlace = useMutation(api.places.remove)

  const handleRemove = async (placeId: Id<"places">) => {
    if (!window.confirm(t("admin.places.deleteConfirm"))) {
      return
    }

    await removePlace({ placeId })
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("admin.places.title")}
        </h1>
        <p className="text-muted-foreground">{t("admin.places.subtitle")}</p>
        <p className="text-sm text-muted-foreground">
          <Link
            to="/admin/translations"
            className="underline underline-offset-2 hover:text-foreground"
          >
            {t("admin.nav.translations")}
          </Link>
        </p>
      </div>

      <AdminLabelForm />
      <AdminPlaceForm />

      <Card>
        <CardHeader>
          <CardTitle>{t("admin.places.existing")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {places === undefined ? (
            <p className="text-sm text-muted-foreground">
              {t("admin.places.loading")}
            </p>
          ) : places.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("admin.places.empty")}
            </p>
          ) : (
            places.map((place) => (
              <div
                key={place._id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-lg border p-3"
              >
                <div className="flex min-w-0 flex-1 gap-3">
                  {(place.coverPhotoThumbnailUrl ?? place.coverPhotoUrl) ? (
                    <img
                      src={place.coverPhotoThumbnailUrl ?? place.coverPhotoUrl}
                      alt={place.name}
                      className="size-20 shrink-0 rounded-md object-cover"
                    />
                  ) : (
                    <div className="flex size-20 shrink-0 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
                      {t("admin.places.noPhoto")}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-1.5 font-medium">
                      {place.name}
                      {place.status === "pending" ? (
                        <Badge className="bg-amber-500/15 text-amber-600">
                          {t("admin.places.pending")}
                        </Badge>
                      ) : null}
                      {place.status === "rejected" ? (
                        <Badge variant="destructive">
                          {t("admin.places.rejected")}
                        </Badge>
                      ) : null}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {PLACE_CATEGORY_META[place.category].label} ·{" "}
                      {place.geometryType === "polygon"
                        ? t("admin.places.area")
                        : t("admin.places.point")}
                    </p>
                    {place.address ? (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {place.address}
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {place.lat.toFixed(4)}, {place.lng.toFixed(4)}
                      </p>
                    )}
                    {place.description ? (
                      <p className="mt-1 text-sm">{place.description}</p>
                    ) : null}
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => void handleRemove(place._id)}
                >
                  <Trash2Icon className="size-4" />
                  {t("admin.places.delete")}
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
