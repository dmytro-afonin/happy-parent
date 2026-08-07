"use client"

import { useEffect, useState } from "react"
import { useAction, useMutation } from "convex/react"
import { CrosshairIcon, Loader2Icon } from "lucide-react"

import { PlaceImageUploader } from "@/components/admin/PlaceImageUploader"
import type { UploadedPlacePhoto } from "@/components/admin/PlaceImageUploader"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useLocalizedNames } from "@/hooks/use-localized-catalog"
import type { PlaceLabel } from "@/hooks/use-localized-catalog"
import { useI18n } from "@/lib/i18n"
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
  getMapCenter: () => { lat: number; lng: number } | null
  isAdmin: boolean
}

export function SuggestPlaceDialog({
  open,
  onOpenChange,
  labels,
  getMapCenter,
  isAdmin,
}: SuggestPlaceDialogProps) {
  const { t } = useI18n()
  const { categoryName, labelName } = useLocalizedNames()
  const createPlace = useMutation(api.places.create)
  const reverseGeocode = useAction(api.geocoding.reverse)

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState<PlaceCategoryId>("entertainment")
  const [selectedLabelIds, setSelectedLabelIds] = useState<Id<"labels">[]>([])
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    null
  )
  const [photos, setPhotos] = useState<UploadedPlacePhoto[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const categoryLabels = (labels ?? []).filter(
    (label) => label.category === category
  )

  const resetAndClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      setName("")
      setDescription("")
      setSelectedLabelIds([])
      setLocation(null)
      setPhotos([])
      setError(null)
      setSubmitted(false)
    }
    onOpenChange(nextOpen)
  }

  const captureMapCenter = () => {
    setLocation(getMapCenter())
  }

  useEffect(() => {
    if (open && !location) {
      setLocation(getMapCenter())
    }
  }, [open, location, getMapCenter])

  const handleOpenChange = (nextOpen: boolean) => {
    resetAndClose(nextOpen)
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

    const point = location ?? getMapCenter()
    if (!point) {
      setError(t("suggest.location"))
      return
    }

    setSubmitting(true)
    try {
      let address: string | undefined
      try {
        address = await reverseGeocode({ lat: point.lat, lng: point.lng })
      } catch {
        address = undefined
      }

      await createPlace({
        name: trimmedName,
        description: description.trim() || undefined,
        address,
        geometryType: "point",
        lat: point.lat,
        lng: point.lng,
        category,
        labelIds: selectedLabelIds,
        photos,
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isAdmin ? t("map.addPlace") : t("suggest.title")}
          </DialogTitle>
          <DialogDescription>{t("suggest.intro")}</DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="space-y-4">
            <p className="text-sm text-green-600">
              {isAdmin ? t("suggest.created") : t("suggest.submitted")}
            </p>
            <Button type="button" onClick={() => resetAndClose(false)}>
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

            <div className="space-y-1.5">
              <span className="text-sm font-medium">{t("suggest.labels")}</span>
              <div className="flex flex-wrap gap-1.5">
                {categoryLabels.map((label) => {
                  const selected = selectedLabelIds.includes(label._id)
                  return (
                    <button
                      key={label._id}
                      type="button"
                      onClick={() => toggleLabel(label._id)}
                    >
                      <Badge variant={selected ? "default" : "outline"}>
                        {labelName(label)}
                      </Badge>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-sm font-medium">
                {t("suggest.location")}
              </span>
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="secondary">
                  {location
                    ? formatCoordinatesAddress(location.lat, location.lng)
                    : "—"}
                </Badge>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={captureMapCenter}
                >
                  <CrosshairIcon className="size-3.5" />
                  {t("suggest.useMapCenter")}
                </Button>
              </div>
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
                  <>
                    <Loader2Icon className="size-4 animate-spin" />
                    {t("suggest.submit")}
                  </>
                ) : isAdmin ? (
                  t("map.addPlace")
                ) : (
                  t("suggest.submit")
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => resetAndClose(false)}
              >
                {t("common.cancel")}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
