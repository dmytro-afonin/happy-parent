"use client"

import { useState } from "react"
import { useAction, useMutation } from "convex/react"
import { Loader2Icon, XIcon } from "lucide-react"
import type * as maplibregl from "maplibre-gl"

import { MapDrawControl } from "@/components/admin/MapDrawControl"
import { PlaceImageUploader } from "@/components/admin/PlaceImageUploader"
import type { UploadedPlacePhoto } from "@/components/admin/PlaceImageUploader"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useLocalizedNames } from "@/hooks/use-localized-catalog"
import type { PlaceLabel } from "@/hooks/use-localized-catalog"
import { useI18n } from "@/lib/i18n"
import type { Locale } from "@/lib/i18n"
import { SUPPORTED_LOCALES } from "@/lib/i18n"
import type { LatLng } from "@/lib/geometry"
import { formatCoordinatesAddress } from "@/lib/navigation-links"
import { PLACE_CATEGORY_LIST } from "@/lib/place-categories"
import type { PlaceCategoryId } from "@/lib/place-categories"
import { cn } from "@/lib/utils"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"

type SuggestPlaceDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  labels: PlaceLabel[] | undefined
  isAdmin: boolean
  map: maplibregl.Map | null
  pickedPoint: { lat: number; lng: number } | null
  geometryMode: "point" | "polygon"
  onGeometryModeChange: (mode: "point" | "polygon") => void
}

type TranslationDraft = { name: string; description: string }

export function SuggestPlaceDialog({
  open,
  onOpenChange,
  labels,
  isAdmin,
  map,
  pickedPoint,
  geometryMode,
  onGeometryModeChange,
}: SuggestPlaceDialogProps) {
  const { t, locale } = useI18n()
  const { categoryName, labelName } = useLocalizedNames()
  const createPlace = useMutation(api.places.create)
  const reverseGeocode = useAction(api.geocoding.reverse)

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState<PlaceCategoryId>("entertainment")
  const [selectedLabelIds, setSelectedLabelIds] = useState<Id<"labels">[]>([])
  const [customLabel, setCustomLabel] = useState("")
  const [boundary, setBoundary] = useState<LatLng[]>([])
  const [photos, setPhotos] = useState<UploadedPlacePhoto[]>([])
  const [translationsOpen, setTranslationsOpen] = useState(false)
  const [translations, setTranslations] = useState<
    Partial<Record<Locale, TranslationDraft>>
  >({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [seenPoint, setSeenPoint] = useState(pickedPoint)
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    null
  )

  if (pickedPoint !== seenPoint) {
    setSeenPoint(pickedPoint)
    if (pickedPoint && geometryMode === "point") {
      setLocation(pickedPoint)
    }
  }

  const categoryLabels = (labels ?? []).filter(
    (label) => label.category === category
  )

  const resetAndClose = () => {
    setName("")
    setDescription("")
    setSelectedLabelIds([])
    setCustomLabel("")
    setBoundary([])
    setLocation(null)
    setPhotos([])
    setTranslations({})
    setError(null)
    setSubmitted(false)
    onGeometryModeChange("point")
    onOpenChange(false)
  }

  const toggleLabel = (labelId: Id<"labels">) => {
    setSelectedLabelIds((current) =>
      current.includes(labelId)
        ? current.filter((entry) => entry !== labelId)
        : [...current, labelId]
    )
  }

  const handleSubmit = async () => {
    setError(null)

    const trimmedName = name.trim()
    if (trimmedName.length === 0) {
      setError(t("suggest.name"))
      return
    }

    if (geometryMode === "polygon" && boundary.length < 3) {
      setError(t("suggest.drawArea"))
      return
    }

    const point = geometryMode === "point" ? location : null
    if (geometryMode === "point" && !point) {
      setError(t("suggest.tapMap"))
      return
    }

    setSubmitting(true)
    try {
      let address: string | undefined
      const geocodePoint =
        point ??
        (boundary[0] ? { lat: boundary[0].lat, lng: boundary[0].lng } : null)
      if (geocodePoint) {
        try {
          address =
            (await reverseGeocode({
              lat: geocodePoint.lat,
              lng: geocodePoint.lng,
            })) ?? undefined
        } catch {
          address = undefined
        }
      }

      const translationPayload = SUPPORTED_LOCALES.flatMap((entry) => {
        if (entry === locale) {
          return []
        }
        const draft = translations[entry]
        const translatedName = draft?.name.trim()
        const translatedDescription = draft?.description.trim()
        if (!translatedName && !translatedDescription) {
          return []
        }
        return [
          {
            locale: entry,
            name: translatedName || undefined,
            description: translatedDescription || undefined,
          },
        ]
      })

      await createPlace({
        name: trimmedName,
        description: description.trim() || undefined,
        address,
        geometryType: geometryMode,
        lat: point?.lat,
        lng: point?.lng,
        boundary: geometryMode === "polygon" ? boundary : undefined,
        category,
        labelIds: selectedLabelIds,
        photos,
        sourceLocale: locale,
        suggestedLabel: customLabel.trim() || undefined,
        translations:
          translationPayload.length > 0 ? translationPayload : undefined,
      })

      setSubmitted(true)
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : t("suggest.error")
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) {
    return null
  }

  return (
    <>
      {map ? (
        <MapDrawControl
          map={map}
          enabled={geometryMode === "polygon"}
          vertices={boundary}
          onVerticesChange={setBoundary}
          position="top-left"
        />
      ) : null}
      <div className="pointer-events-auto absolute inset-x-3 bottom-3 z-30 max-h-[48%] overflow-y-auto rounded-2xl border bg-background p-4 shadow-xl sm:inset-x-auto sm:top-16 sm:bottom-3 sm:left-3 sm:max-h-none sm:w-[22rem]">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold">
              {isAdmin ? t("map.addPlace") : t("suggest.title")}
            </h2>
            <p className="text-xs text-muted-foreground">
              {t("suggest.intro")}
            </p>
          </div>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label={t("common.close")}
            onClick={resetAndClose}
          >
            <XIcon className="size-4" />
          </Button>
        </div>

        {submitted ? (
          <div className="space-y-4">
            <p className="text-sm text-green-600">
              {isAdmin ? t("suggest.created") : t("suggest.submitted")}
            </p>
            <Button type="button" onClick={resetAndClose}>
              {t("common.close")}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <label className="block space-y-1 text-sm">
              <span className="font-medium">{t("suggest.name")}</span>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t("suggest.namePlaceholder")}
              />
            </label>

            <label className="block space-y-1 text-sm">
              <span className="font-medium">{t("suggest.description")}</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                className="flex min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:outline-none"
              />
            </label>

            <div className="space-y-1.5">
              <span className="text-sm font-medium">
                {t("suggest.category")}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {PLACE_CATEGORY_LIST.map((entry) => {
                  const Icon = entry.icon
                  const selected = category === entry.id
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => {
                        setCategory(entry.id)
                        setSelectedLabelIds([])
                      }}
                      className={cn(
                        "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm transition-colors",
                        selected
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/50"
                      )}
                    >
                      <span
                        className="flex size-5 items-center justify-center rounded-full text-white"
                        style={{ backgroundColor: entry.color }}
                      >
                        <Icon className="size-3" />
                      </span>
                      {categoryName(entry.id)}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {categoryLabels.map((label) => {
                const selected = selectedLabelIds.includes(label._id)
                return (
                  <button
                    key={label._id}
                    type="button"
                    onClick={() => toggleLabel(label._id)}
                  >
                    <Badge
                      variant={selected ? "default" : "outline"}
                      className="px-2.5 py-1 text-sm"
                    >
                      {labelName(label)}
                    </Badge>
                  </button>
                )
              })}
            </div>

            <label className="block space-y-1 text-sm">
              <span className="font-medium">{t("suggest.customLabel")}</span>
              <Input
                value={customLabel}
                onChange={(event) => setCustomLabel(event.target.value)}
                placeholder={t("suggest.customLabelPlaceholder")}
              />
            </label>

            <div className="space-y-1.5">
              <span className="text-sm font-medium">
                {t("suggest.location")}
              </span>
              <div className="flex gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant={geometryMode === "point" ? "secondary" : "outline"}
                  onClick={() => onGeometryModeChange("point")}
                >
                  {t("suggest.pin")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={geometryMode === "polygon" ? "secondary" : "outline"}
                  onClick={() => onGeometryModeChange("polygon")}
                >
                  {t("suggest.drawArea")}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("suggest.tapMap")}
              </p>
              <Badge variant="secondary">
                {geometryMode === "polygon"
                  ? boundary.length >= 3
                    ? `${boundary.length}`
                    : "—"
                  : location
                    ? formatCoordinatesAddress(location.lat, location.lng)
                    : "—"}
              </Badge>
            </div>

            <div className="space-y-1.5">
              <button
                type="button"
                className="text-sm font-medium"
                onClick={() => setTranslationsOpen((current) => !current)}
              >
                {t("suggest.translations")}
              </button>
              {translationsOpen ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {t("suggest.translationsHint")}
                  </p>
                  {SUPPORTED_LOCALES.filter((entry) => entry !== locale).map(
                    (entry) => (
                      <div key={entry} className="space-y-1">
                        <span className="text-xs font-medium uppercase">
                          {entry}
                        </span>
                        <Input
                          value={translations[entry]?.name ?? ""}
                          placeholder={t("suggest.name")}
                          onChange={(event) =>
                            setTranslations((current) => ({
                              ...current,
                              [entry]: {
                                name: event.target.value,
                                description: current[entry]?.description ?? "",
                              },
                            }))
                          }
                        />
                      </div>
                    )
                  )}
                </div>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <span className="text-sm font-medium">{t("place.photos")}</span>
              <PlaceImageUploader photos={photos} onChange={setPhotos} />
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <div className="flex gap-2">
              <Button
                type="button"
                disabled={submitting}
                onClick={() => void handleSubmit()}
              >
                {submitting ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : null}
                {isAdmin ? t("map.addPlace") : t("suggest.submit")}
              </Button>
              <Button type="button" variant="outline" onClick={resetAndClose}>
                {t("common.cancel")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
