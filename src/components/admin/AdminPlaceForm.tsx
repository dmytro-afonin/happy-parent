"use client"

import { useMemo, useState } from "react"
import { useAction, useMutation } from "convex/react"
import { useNavigate } from "@tanstack/react-router"
import { Loader2Icon } from "lucide-react"

import { AdminCoordinateEditor } from "@/components/admin/AdminCoordinateEditor"
import { AdminPlaceMapEditor } from "@/components/admin/AdminPlaceMapEditor"
import { PlaceImageUploader } from "@/components/admin/PlaceImageUploader"
import type { UploadedPlacePhoto } from "@/components/admin/PlaceImageUploader"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { computeCentroid, validatePlaceGeometry } from "@/lib/geometry"
import type { GeometryType, LatLng, LocationInputMode } from "@/lib/geometry"
import { Badge } from "@/components/ui/badge"
import { useLabels } from "@/hooks/use-localized-catalog"
import {
  PLACE_CATEGORY_LIST,
  PLACE_CATEGORY_META,
} from "@/lib/place-categories"
import type { PlaceCategoryId } from "@/lib/place-categories"
import { cn } from "@/lib/utils"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"

type AdminPlaceFormProps = {
  onCreated?: () => void
}

function ModeButton({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "secondary" : "ghost"}
      onClick={onClick}
    >
      {children}
    </Button>
  )
}

export function AdminPlaceForm({ onCreated }: AdminPlaceFormProps) {
  const navigate = useNavigate()
  const createPlace = useMutation(api.places.create)
  const reverseGeocode = useAction(api.geocoding.reverse)

  const labels = useLabels()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState<PlaceCategoryId>("entertainment")
  const [selectedLabelIds, setSelectedLabelIds] = useState<Id<"labels">[]>([])
  const [locationInputMode, setLocationInputMode] =
    useState<LocationInputMode>("map")
  const [geometryType, setGeometryType] = useState<GeometryType>("point")
  const [point, setPoint] = useState<LatLng | null>(null)
  const [vertices, setVertices] = useState<LatLng[]>([])
  const [photos, setPhotos] = useState<UploadedPlacePhoto[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const geometryError = useMemo(
    () => validatePlaceGeometry(geometryType, point, vertices),
    [geometryType, point, vertices]
  )

  const resetForm = () => {
    setName("")
    setDescription("")
    setCategory("entertainment")
    setSelectedLabelIds([])
    setPoint(null)
    setVertices([])
    setPhotos([])
    setError(null)
    setSuccess(null)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    if (name.trim().length === 0) {
      setError("Name is required.")
      return
    }

    if (geometryError) {
      setError(geometryError)
      return
    }

    setSubmitting(true)

    try {
      const resolvedPoint =
        geometryType === "point" && point
          ? point
          : geometryType === "polygon" && vertices.length > 0
            ? computeCentroid(vertices)
            : null

      let address: string | undefined
      if (resolvedPoint) {
        try {
          address = await reverseGeocode({
            lat: resolvedPoint.lat,
            lng: resolvedPoint.lng,
          })
        } catch {
          address = undefined
        }
      }

      await createPlace({
        name: name.trim(),
        description: description.trim() || undefined,
        address,
        geometryType,
        lat: geometryType === "point" ? point?.lat : undefined,
        lng: geometryType === "point" ? point?.lng : undefined,
        boundary: geometryType === "polygon" ? vertices : undefined,
        category,
        labelIds: selectedLabelIds,
        photos,
      })

      resetForm()
      setSuccess("Place created successfully.")
      onCreated?.()
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not create place."
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Place details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Name</span>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Playground at Łazienki Park"
              required
            />
          </label>

          <label className="block space-y-1 text-sm">
            <span className="font-medium">Description</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What makes this place family-friendly?"
              rows={4}
              className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
            />
          </label>

          <div className="space-y-2">
            <span className="text-sm font-medium">Category</span>
            <div className="grid gap-2 sm:grid-cols-3">
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
                      "flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                      selected
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50"
                    )}
                  >
                    <span
                      className="flex size-8 shrink-0 items-center justify-center rounded-full text-white"
                      style={{ backgroundColor: entry.color }}
                    >
                      <Icon className="size-4" />
                    </span>
                    <span>
                      <span className="block font-medium">{entry.label}</span>
                      <span className="block text-xs text-muted-foreground">
                        {PLACE_CATEGORY_META[entry.id].description}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-sm font-medium">Place types</span>
            <div className="flex flex-wrap gap-1.5">
              {(labels ?? [])
                .filter((label) => label.category === category)
                .map((label) => {
                  const selected = selectedLabelIds.includes(label._id)

                  return (
                    <button
                      key={label._id}
                      type="button"
                      onClick={() =>
                        setSelectedLabelIds((current) =>
                          current.includes(label._id)
                            ? current.filter((entry) => entry !== label._id)
                            : [...current, label._id]
                        )
                      }
                    >
                      <Badge variant={selected ? "default" : "outline"}>
                        {label.name}
                      </Badge>
                    </button>
                  )
                })}
            </div>
            <span className="text-xs text-muted-foreground">
              Pick one or more place types describing this place.
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Location</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-1 rounded-lg border p-1">
            <ModeButton
              active={locationInputMode === "map"}
              onClick={() => setLocationInputMode("map")}
            >
              Search on map
            </ModeButton>
            <ModeButton
              active={locationInputMode === "coordinates"}
              onClick={() => setLocationInputMode("coordinates")}
            >
              Enter coordinates
            </ModeButton>
          </div>

          <div className="flex flex-wrap gap-1 rounded-lg border p-1">
            <ModeButton
              active={geometryType === "point"}
              onClick={() => setGeometryType("point")}
            >
              Point
            </ModeButton>
            <ModeButton
              active={geometryType === "polygon"}
              onClick={() => setGeometryType("polygon")}
            >
              Area
            </ModeButton>
          </div>

          {locationInputMode === "map" ? (
            <AdminPlaceMapEditor
              geometryType={geometryType}
              point={point}
              vertices={vertices}
              onPointChange={setPoint}
              onVerticesChange={setVertices}
            />
          ) : (
            <AdminCoordinateEditor
              geometryType={geometryType}
              point={point}
              vertices={vertices}
              onPointChange={setPoint}
              onVerticesChange={setVertices}
            />
          )}

          {geometryError ? (
            <p className="text-sm text-destructive">{geometryError}</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Photos</CardTitle>
        </CardHeader>
        <CardContent>
          <PlaceImageUploader photos={photos} onChange={setPhotos} />
        </CardContent>
      </Card>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {success ? <p className="text-sm text-green-600">{success}</p> : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2Icon className="size-4 animate-spin" />
              Creating…
            </>
          ) : (
            "Create place"
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => void navigate({ to: "/map" })}
        >
          Back to map
        </Button>
      </div>
    </form>
  )
}
