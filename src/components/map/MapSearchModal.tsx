"use client"

import { useConvexAuth, useAction, useMutation, useQuery } from "convex/react"
import { HeartIcon, MapPinIcon, SearchIcon, StarIcon } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

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
import { cn } from "@/lib/utils"
import {
  buildFavouriteLookup,
  enrichResultsWithDistance,
  filterResultsByTab,
  findFavouriteForPlace,
  type PlaceSearchResult,
  type SearchResultsTab,
} from "@/lib/place-search"
import { SaveFavouriteDialog } from "@/components/map/SaveFavouriteDialog"
import type { MapSearchViewport } from "@/components/map/MapView"
import {
  matchPlaceCategories,
  PLACE_CATEGORY_LIST,
  PLACE_CATEGORY_META,
  type PlaceCategoryId,
} from "@/lib/place-categories"
import { api } from "../../../convex/_generated/api"

type MapSearchModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialQuery?: string
  getSearchViewport?: () => MapSearchViewport | null
  userLocation?: { lat: number; lng: number } | null
  onSelectPlace: (place: PlaceSearchResult, query: string) => void
  onCategorySelect?: (category: PlaceCategoryId) => void
  activeCategories?: PlaceCategoryId[]
}

const tabs: Array<{ id: SearchResultsTab; label: string }> = [
  { id: "all", label: "All" },
  { id: "recent", label: "Recents" },
  { id: "map", label: "Map" },
]

export function MapSearchModal({
  open,
  onOpenChange,
  initialQuery = "",
  getSearchViewport,
  userLocation = null,
  onSelectPlace,
  onCategorySelect,
  activeCategories = [],
}: MapSearchModalProps) {
  const { isAuthenticated } = useConvexAuth()
  const [query, setQuery] = useState(initialQuery)
  const [tab, setTab] = useState<SearchResultsTab>("all")
  const [geocodingResults, setGeocodingResults] = useState<PlaceSearchResult[]>(
    [],
  )
  const [isGeocoding, setIsGeocoding] = useState(false)
  const [geocodingError, setGeocodingError] = useState<string | null>(null)
  const [favouritePlace, setFavouritePlace] = useState<PlaceSearchResult | null>(
    null,
  )
  const [favouriteDialogOpen, setFavouriteDialogOpen] = useState(false)

  const searchGeocoding = useAction(api.geocoding.search)
  const saveFavourite = useMutation(api.favouritePlaces.save)
  const favourites = useQuery(
    api.favouritePlaces.list,
    isAuthenticated ? {} : "skip",
  )
  const favouriteLookup = useMemo(
    () => buildFavouriteLookup(favourites ?? []),
    [favourites],
  )
  const recentResults = useQuery(
    api.recentSearches.search,
    isAuthenticated && query.trim().length >= 2
      ? { query: query.trim(), limit: 20 }
      : "skip",
  )
  const recentCategories = useQuery(
    api.recentCategories.list,
    isAuthenticated ? { limit: 8 } : "skip",
  )

  useEffect(() => {
    if (open) {
      setQuery(initialQuery)
      setTab("all")
    }
  }, [initialQuery, open])

  useEffect(() => {
    const trimmed = query.trim()
    if (!open || trimmed.length < 2) {
      setGeocodingResults([])
      setGeocodingError(null)
      setIsGeocoding(false)
      return
    }

    setIsGeocoding(true)
    setGeocodingError(null)

    const timeout = window.setTimeout(() => {
      const viewport = getSearchViewport?.() ?? null

      void searchGeocoding({
        query: trimmed,
        limit: 20,
        centerLat: viewport?.center.lat,
        centerLng: viewport?.center.lng,
        minLat: viewport?.bounds.minLat,
        maxLat: viewport?.bounds.maxLat,
        minLng: viewport?.bounds.minLng,
        maxLng: viewport?.bounds.maxLng,
      })
        .then((results) => {
          setGeocodingResults(results)
        })
        .catch(() => {
          setGeocodingError("Could not search the map right now.")
          setGeocodingResults([])
        })
        .finally(() => {
          setIsGeocoding(false)
        })
    }, 400)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [getSearchViewport, open, query, searchGeocoding])

  const recents = recentResults ?? []
  const visibleResults = useMemo(() => {
    const results = filterResultsByTab(tab, recents, geocodingResults)
    return enrichResultsWithDistance(results, userLocation)
  }, [tab, recents, geocodingResults, userLocation])

  const matchingCategories = useMemo(
    () => matchPlaceCategories(query),
    [query],
  )

  const handleCategorySelect = (category: PlaceCategoryId) => {
    onCategorySelect?.(category)
    setQuery(PLACE_CATEGORY_META[category].label)
    setTab("map")
  }

  const handleSelect = (place: PlaceSearchResult) => {
    onSelectPlace(place, query.trim())
    onOpenChange(false)
  }

  const handleSaveFavourite = async (name: string) => {
    if (!favouritePlace) {
      return
    }

    await saveFavourite({
      name,
      label: favouritePlace.label,
      subtitle: favouritePlace.subtitle,
      lat: favouritePlace.lat,
      lng: favouritePlace.lng,
      externalId: favouritePlace.externalId,
    })
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
          <DialogHeader className="gap-3 border-b px-4 pt-4 pb-3">
            <DialogTitle>Search places</DialogTitle>
            <DialogDescription>
              Results near the map area on screen
              {userLocation ? ", with distance from your location." : "."}
            </DialogDescription>
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Park, cafe, address…"
                className="pl-8"
              />
            </div>

            {matchingCategories.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Category suggestions
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {matchingCategories.map((category) => {
                    const Icon = category.icon
                    const isActive = activeCategories.includes(category.id)

                    return (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => handleCategorySelect(category.id)}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
                          isActive
                            ? "border-primary bg-primary/10"
                            : "bg-muted/40 hover:bg-muted",
                        )}
                      >
                        <span
                          className="flex size-5 items-center justify-center rounded-full text-white"
                          style={{ backgroundColor: category.color }}
                        >
                          <Icon className="size-3" />
                        </span>
                        {category.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : null}

            {query.trim().length < 2 &&
            recentCategories &&
            recentCategories.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Recent categories
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {recentCategories.map((entry) => {
                    const meta = PLACE_CATEGORY_META[entry.category]
                    const categoryEntry = PLACE_CATEGORY_LIST.find(
                      (item) => item.id === entry.category,
                    )
                    const Icon = categoryEntry?.icon

                    return (
                      <button
                        key={`${entry.category}-${entry.searchedAt}`}
                        type="button"
                        onClick={() => handleCategorySelect(entry.category)}
                        className="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-2.5 py-1 text-xs transition-colors hover:bg-muted"
                      >
                        {Icon ? (
                          <span
                            className="flex size-5 items-center justify-center rounded-full text-white"
                            style={{ backgroundColor: meta.color }}
                          >
                            <Icon className="size-3" />
                          </span>
                        ) : null}
                        {meta.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : null}

            <div className="flex gap-1">
              {tabs.map((entry) => (
                <Button
                  key={entry.id}
                  type="button"
                  size="sm"
                  variant={tab === entry.id ? "secondary" : "ghost"}
                  onClick={() => setTab(entry.id)}
                >
                  {entry.label}
                  <span className="ml-1 text-xs text-muted-foreground">
                    {entry.id === "all"
                      ? filterResultsByTab("all", recents, geocodingResults)
                          .length
                      : entry.id === "recent"
                        ? recents.length
                        : geocodingResults.length}
                  </span>
                </Button>
              ))}
            </div>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
            {query.trim().length < 2 &&
            matchingCategories.length === 0 &&
            (!recentCategories || recentCategories.length === 0) ? (
              <p className="px-2 py-8 text-center text-sm text-muted-foreground">
                Type at least 2 characters to search, or pick a category above.
              </p>
            ) : query.trim().length < 2 ? (
              <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                Pick a category above or type to search places.
              </p>
            ) : isGeocoding && visibleResults.length === 0 ? (
              <p className="px-2 py-8 text-center text-sm text-muted-foreground">
                Searching…
              </p>
            ) : geocodingError && visibleResults.length === 0 ? (
              <p className="px-2 py-8 text-center text-sm text-destructive">
                {geocodingError}
              </p>
            ) : visibleResults.length === 0 ? (
              <p className="px-2 py-8 text-center text-sm text-muted-foreground">
                No results for this tab.
              </p>
            ) : (
              <ul className="space-y-1">
                {visibleResults.map((place) => {
                  const savedFavourite = findFavouriteForPlace(
                    place,
                    favouriteLookup,
                  )

                  return (
                  <li key={place.id}>
                    <div className="flex items-start gap-2 rounded-lg border border-transparent px-2 py-2 hover:border-border hover:bg-muted/40">
                      <div className="mt-0.5 shrink-0 text-muted-foreground">
                        {place.source === "recent" ? (
                          <StarIcon className="size-4" />
                        ) : (
                          <MapPinIcon className="size-4" />
                        )}
                      </div>
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left"
                        onClick={() => handleSelect(place)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="truncate text-sm font-medium">
                            {place.label}
                          </div>
                          {place.distanceLabel ? (
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {place.distanceLabel}
                            </span>
                          ) : null}
                        </div>
                        {place.subtitle ? (
                          <div className="truncate text-xs text-muted-foreground">
                            {place.subtitle}
                          </div>
                        ) : null}
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <span className="text-[0.7rem] text-muted-foreground uppercase">
                            {place.source === "recent" ? "Recent" : "Map"}
                          </span>
                          {savedFavourite ? (
                            <Badge variant="secondary" className="normal-case">
                              Saved as {savedFavourite.name}
                            </Badge>
                          ) : null}
                        </div>
                      </button>
                      {isAuthenticated ? (
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          aria-label={
                            savedFavourite
                              ? `Saved as ${savedFavourite.name}`
                              : `Save ${place.label} to favourites`
                          }
                          disabled={Boolean(savedFavourite)}
                          onClick={() => {
                            if (savedFavourite) {
                              return
                            }

                            setFavouritePlace(place)
                            setFavouriteDialogOpen(true)
                          }}
                        >
                          <HeartIcon
                            className={cn(
                              "size-4",
                              savedFavourite && "fill-current text-red-500",
                            )}
                          />
                        </Button>
                      ) : null}
                    </div>
                  </li>
                  )
                })}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <SaveFavouriteDialog
        open={favouriteDialogOpen}
        onOpenChange={setFavouriteDialogOpen}
        place={favouritePlace}
        onSave={handleSaveFavourite}
      />
    </>
  )
}

export function MapSearchBar({
  onOpenSearch,
}: {
  onOpenSearch: () => void
}) {
  return (
    <button
      type="button"
      onClick={onOpenSearch}
      className={cn(
        "flex h-7 min-w-0 flex-1 items-center gap-2 rounded-lg border border-input bg-background px-2 text-left text-sm transition-colors",
        "hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
      )}
    >
      <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
      <span className="truncate text-muted-foreground">Search places…</span>
    </button>
  )
}
