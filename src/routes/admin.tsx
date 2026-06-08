"use client"

import { Link, createFileRoute } from "@tanstack/react-router"
import { Show, SignInButton } from "@clerk/react"
import { useConvexAuth, useMutation, useQuery } from "convex/react"
import { Trash2Icon } from "lucide-react"

import { AdminPlaceForm } from "@/components/admin/AdminPlaceForm"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PLACE_CATEGORY_META } from "@/lib/place-categories"
import { useAdminStatus } from "@/hooks/use-admin-status"
import { api } from "../../convex/_generated/api"
import type { Id } from "../../convex/_generated/dataModel"

export const Route = createFileRoute("/admin")({
  component: AdminPage,
})

function AdminPage() {
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth()
  const { isAdmin, isLoading: isAdminLoading } = useAdminStatus()
  const places = useQuery(
    api.places.listAllAdmin,
    isAdmin ? {} : "skip",
  )
  const removePlace = useMutation(api.places.remove)

  if (isAuthLoading || isAdminLoading) {
    return (
      <main className="container mx-auto max-w-5xl px-4 py-8">
        <p className="text-muted-foreground">Loading admin…</p>
      </main>
    )
  }

  if (!isAuthenticated) {
    return (
      <main className="container mx-auto max-w-5xl px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="mt-2 text-muted-foreground">
          Sign in with an admin account to manage places.
        </p>
        <Show when="signed-out">
          <SignInButton mode="modal">
            <Button className="mt-4">Sign in</Button>
          </SignInButton>
        </Show>
      </main>
    )
  }

  if (!isAdmin) {
    return (
      <main className="container mx-auto max-w-5xl px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">Access denied</h1>
        <p className="mt-2 text-muted-foreground">
          Your account does not have admin permissions.
        </p>
        <Button className="mt-4" asChild>
          <Link to="/map">Go to map</Link>
        </Button>
      </main>
    )
  }

  const handleRemove = async (placeId: Id<"places">) => {
    if (!window.confirm("Delete this place and its photos?")) {
      return
    }

    await removePlace({ placeId })
  }

  return (
    <main className="container mx-auto max-w-5xl space-y-8 px-4 py-8">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">Admin</h1>
          <Badge>Places</Badge>
        </div>
        <p className="text-muted-foreground">
          Create family-friendly places as points or outlined areas, with photos
          stored in ImageKit.
        </p>
      </div>

      <AdminPlaceForm />

      <Card>
        <CardHeader>
          <CardTitle>Existing places</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {places === undefined ? (
            <p className="text-sm text-muted-foreground">Loading places…</p>
          ) : places.length === 0 ? (
            <p className="text-sm text-muted-foreground">No places yet.</p>
          ) : (
            places.map((place) => (
              <div
                key={place._id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-lg border p-3"
              >
                <div className="flex min-w-0 flex-1 gap-3">
                  {place.coverPhotoThumbnailUrl ?? place.coverPhotoUrl ? (
                    <img
                      src={place.coverPhotoThumbnailUrl ?? place.coverPhotoUrl}
                      alt={place.name}
                      className="size-20 shrink-0 rounded-md object-cover"
                    />
                  ) : (
                    <div className="flex size-20 shrink-0 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
                      No photo
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-medium">{place.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {PLACE_CATEGORY_META[place.category].label} ·{" "}
                      {place.geometryType === "polygon" ? "Area" : "Point"}
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
                  Delete
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </main>
  )
}
