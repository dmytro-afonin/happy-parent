"use client"

import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useConvexAuth, useMutation, useQuery } from "convex/react"
import type * as maplibregl from "maplibre-gl"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { MapCompactToolbar } from "@/components/map/MapCompactToolbar"
import { MapSearchModal } from "@/components/map/MapSearchModal"
import { MapSidePanel } from "@/components/map/MapSidePanel"
import { MapView } from "@/components/map/MapView"
import type { MapViewHandle } from "@/components/map/MapView"
import { PlaceCard } from "@/components/map/PlaceCard"
import { PlaceCategoryLayers } from "@/components/map/PlaceCategoryLayers"
import type { MapPlace } from "@/components/map/PlaceCategoryLayers"
import { SuggestPlaceDialog } from "@/components/map/SuggestPlaceDialog"
import { DEFAULT_MAP_STYLE_ID } from "@/components/map/map-styles"
import type { MapStyleId } from "@/components/map/map-styles"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useAdminStatus } from "@/hooks/use-admin-status"
import { useIsMobile } from "@/hooks/use-mobile"
import { useLabels, useLocalizedNames } from "@/hooks/use-localized-catalog"
import { useI18n } from "@/lib/i18n"
import {
  clearRoute,
  drawRoute,
  fetchWalkingRoute,
  formatRouteSummary,
  isRouteErrorCode,
} from "@/lib/map/route-layer"
import type { MessageKey } from "@/lib/i18n"
import type { PlaceSearchResult } from "@/lib/place-search"
import { isPlaceCategoryId, PLACE_CATEGORIES } from "@/lib/place-categories"
import type { PlaceCategoryId } from "@/lib/place-categories"
import type { SidePanelSection } from "@/lib/map-preferences"
import { api } from "../../convex/_generated/api"

type MapSearchParams = {
  category?: PlaceCategoryId
  label?: string
  place?: string
}

export const Route = createFileRoute("/map")({
  validateSearch: (search: Record<string, unknown>): MapSearchParams => ({
    category:
      typeof search.category === "string" && isPlaceCategoryId(search.category)
        ? search.category
        : undefined,
    label: typeof search.label === "string" ? search.label : undefined,
    place: typeof search.place === "string" ? search.place : undefined,
  }),
  component: MapPage,
})

function MapPage() {
  const {
    category: urlCategory,
    label: urlLabel,
    place: urlPlace,
  } = Route.useSearch()
  const navigate = useNavigate()
  const { t, locale } = useI18n()
  const { categoryName, labelName } = useLocalizedNames()
  const mapRef = useRef<MapViewHandle>(null)
  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [pickedPoint, setPickedPoint] = useState<{
    lat: number
    lng: number
  } | null>(null)
  const [composerMode, setComposerMode] = useState<"point" | "polygon">("point")
  const [activeCategories, setActiveCategories] = useState<PlaceCategoryId[]>(
    () => (urlCategory ? [urlCategory] : [...PLACE_CATEGORIES])
  )
  const [activeLabelIds, setActiveLabelIds] = useState<string[]>([])
  const [selectedPlace, setSelectedPlace] = useState<MapPlace | null>(null)
  const [sidePanelSection, setSidePanelSection] = useState<
    SidePanelSection | undefined
  >("categories")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userLocation, setUserLocation] = useState<{
    lat: number
    lng: number
  } | null>(null)
  const [routeLoading, setRouteLoading] = useState(false)
  const [routeSummary, setRouteSummary] = useState<string | null>(null)
  const [routeError, setRouteError] = useState<string | null>(null)
  const urlPlaceAppliedRef = useRef<string | null>(null)
  const [prefsHydrated, setPrefsHydrated] = useState(false)
  const [trackedUrlCategory, setTrackedUrlCategory] = useState(urlCategory)
  const [trackedUrlLabel, setTrackedUrlLabel] = useState<string | null>(null)
  const [trackedUrlPlace, setTrackedUrlPlace] = useState<string | null>(null)

  if (urlCategory !== trackedUrlCategory) {
    setTrackedUrlCategory(urlCategory)
    if (urlCategory) {
      setActiveCategories([urlCategory])
    }
  }

  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth()
  const { isAdmin } = useAdminStatus()
  const isMobile = useIsMobile()
  const isAuthenticatedRef = useRef(isAuthenticated)
  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated
  }, [isAuthenticated])
  const systemPlaces = useQuery(api.places.list, {})
  const labels = useLabels()
  const savedPreferences = useQuery(
    api.mapPreferences.getPreferences,
    isAuthenticated ? {} : "skip"
  )
  const updatePreferences = useMutation(api.mapPreferences.updatePreferences)
  const ensureCurrentUser = useMutation(api.users.ensureCurrentUser)
  const recordRecentSearch = useMutation(api.recentSearches.record)
  const recordRecentCategory = useMutation(api.recentCategories.record)

  useEffect(() => {
    if (isAuthenticated) {
      void ensureCurrentUser()
    }
  }, [ensureCurrentUser, isAuthenticated])

  const clearCategorySearchParam = useCallback(() => {
    void navigate({
      to: "/map",
      search: urlPlace ? { place: urlPlace } : {},
      replace: true,
    })
  }, [navigate, urlPlace])

  if (urlLabel && labels && trackedUrlLabel !== urlLabel) {
    setTrackedUrlLabel(urlLabel)
    const label = labels.find((entry) => entry.slug === urlLabel)
    if (label) {
      setActiveCategories([label.category])
      setActiveLabelIds([label._id])
    }
  }

  if (!isAuthenticated && prefsHydrated) {
    setPrefsHydrated(false)
  } else if (isAuthenticated && savedPreferences && !prefsHydrated) {
    setPrefsHydrated(true)
    if (!urlCategory && !urlLabel) {
      setActiveCategories(savedPreferences.activeCategories)
    }
    setSidePanelSection(savedPreferences.sidePanelSection)
    setSidebarOpen(savedPreferences.sidebarOpen)
  }

  const mapPlaces = useMemo<MapPlace[]>(
    () =>
      (systemPlaces ?? []).map((place) => ({
        _id: place._id,
        name: place.name,
        description: place.description,
        address: place.address,
        lat: place.lat,
        lng: place.lng,
        category: place.category,
        labelIds: place.labelIds,
        status: place.status,
        isOwn: place.isOwn,
        geometryType: place.geometryType ?? "point",
        boundary: place.boundary,
        coverPhotoUrl: place.coverPhotoUrl,
        coverPhotoThumbnailUrl: place.coverPhotoThumbnailUrl,
      })),
    [systemPlaces]
  )

  const catalogPlaces = useMemo(
    () =>
      mapPlaces.map((place) => ({
        id: place._id,
        name: place.name,
        address: place.address,
        description: place.description,
        lat: place.lat,
        lng: place.lng,
        categoryLabel: categoryName(place.category),
        labelNames: (place.labelIds ?? [])
          .map((labelId) => {
            const label = labels?.find((entry) => entry._id === labelId)
            return label ? labelName(label) : ""
          })
          .filter((name) => name.length > 0),
      })),
    [categoryName, labelName, labels, mapPlaces]
  )

  const labelOptions = useMemo(
    () =>
      (labels ?? []).map((label) => ({
        id: label._id,
        name: labelName(label),
        categoryLabel: categoryName(label.category),
      })),
    [categoryName, labelName, labels]
  )

  const linkedPlace =
    urlPlace && systemPlaces !== undefined
      ? mapPlaces.find((entry) => entry._id === urlPlace)
      : undefined

  if (urlPlace && linkedPlace && trackedUrlPlace !== urlPlace) {
    setTrackedUrlPlace(urlPlace)
    setSelectedPlace(linkedPlace)
    setActiveCategories((current) =>
      current.includes(linkedPlace.category)
        ? current
        : [...current, linkedPlace.category]
    )
  }

  // Share deep link (?place=<id>) flies the map once the place is known.
  useEffect(() => {
    if (
      !urlPlace ||
      !linkedPlace ||
      !mapInstance ||
      urlPlaceAppliedRef.current === urlPlace
    ) {
      return
    }

    urlPlaceAppliedRef.current = urlPlace
    mapRef.current?.flyTo({ lat: linkedPlace.lat, lng: linkedPlace.lng })
  }, [linkedPlace, mapInstance, urlPlace])

  const persistCategories = useCallback(
    (
      updater:
        | PlaceCategoryId[]
        | ((current: PlaceCategoryId[]) => PlaceCategoryId[]),
      options?: { clearUrl?: boolean }
    ) => {
      setActiveCategories((current) => {
        const next = typeof updater === "function" ? updater(current) : updater
        if (isAuthenticatedRef.current) {
          void updatePreferences({ activeCategories: next })
        }
        return next
      })

      if (options?.clearUrl !== false && (urlCategory || urlLabel)) {
        clearCategorySearchParam()
      }
    },
    [clearCategorySearchParam, updatePreferences, urlCategory, urlLabel]
  )

  const handleStyleChange = useCallback(
    (styleId: MapStyleId) => {
      if (!isAuthenticated) {
        return
      }

      void updatePreferences({ mapStyleId: styleId })
    },
    [isAuthenticated, updatePreferences]
  )

  const handleSelectCategory = useCallback(
    (category: PlaceCategoryId) => {
      persistCategories([category])
      if (isAuthenticated) {
        void recordRecentCategory({ category })
      }
    },
    [isAuthenticated, persistCategories, recordRecentCategory]
  )

  const handleSelectPlace = useCallback(
    (place: PlaceSearchResult, query: string) => {
      if (place.placeId) {
        const saved = mapPlaces.find((entry) => entry._id === place.placeId)
        if (saved) {
          setSelectedPlace(saved)
        }
      }
      if (place.source !== "label") {
        mapRef.current?.flyTo({ lat: place.lat, lng: place.lng })
      }

      if (isAuthenticated && place.source !== "label") {
        void recordRecentSearch({
          query: query || place.label,
          label: place.label,
          subtitle: place.subtitle,
          lat: place.lat,
          lng: place.lng,
          externalId: place.externalId,
        })
      }
    },
    [isAuthenticated, mapPlaces, recordRecentSearch]
  )

  const handleSelectLabel = useCallback(
    (labelId: string) => {
      const label = labels?.find((entry) => entry._id === labelId)
      if (!label) {
        return
      }
      persistCategories((current) =>
        current.includes(label.category)
          ? current
          : [...current, label.category]
      )
      setActiveLabelIds((current) =>
        current.includes(labelId) ? current : [...current, labelId]
      )
      setSidePanelSection("categories")
    },
    [labels, persistCategories]
  )

  const handleSelectSavedPlace = useCallback(
    (placeId: string) => {
      const place = mapPlaces.find((entry) => entry._id === placeId)
      if (place) {
        setSelectedPlace(place)
        mapRef.current?.flyTo({ lat: place.lat, lng: place.lng })
      }
    },
    [mapPlaces]
  )

  const handleToggleCategory = useCallback(
    (category: PlaceCategoryId) => {
      persistCategories((current) =>
        current.includes(category)
          ? current.filter((entry) => entry !== category)
          : [...current, category]
      )
    },
    [persistCategories]
  )

  const handleToggleLabel = useCallback((labelId: string) => {
    setActiveLabelIds((current) =>
      current.includes(labelId)
        ? current.filter((entry) => entry !== labelId)
        : [...current, labelId]
    )
  }, [])

  const handleSidePanelSectionChange = useCallback(
    (section: SidePanelSection | undefined) => {
      setSidePanelSection(section)
      if (isAuthenticated && section) {
        void updatePreferences({ sidePanelSection: section })
      }
    },
    [isAuthenticated, updatePreferences]
  )

  const handleSidebarOpenChange = useCallback(
    (open: boolean) => {
      setSidebarOpen(open)
      if (isAuthenticated) {
        void updatePreferences({ sidebarOpen: open })
      }
    },
    [isAuthenticated, updatePreferences]
  )

  const closeSidePanel = useCallback(() => {
    handleSidebarOpenChange(false)
  }, [handleSidebarOpenChange])

  const handleClearRoute = useCallback(() => {
    if (mapInstance) {
      clearRoute(mapInstance)
    }
    setRouteSummary(null)
    setRouteError(null)
  }, [mapInstance])

  const handleCloseCard = useCallback(() => {
    setSelectedPlace(null)
    handleClearRoute()
  }, [handleClearRoute])

  const handleShowRoute = useCallback(async () => {
    if (!selectedPlace || !mapInstance) {
      return
    }

    setRouteError(null)
    setRouteSummary(null)
    setRouteLoading(true)

    try {
      let from = mapRef.current?.getUserLocation() ?? userLocation

      if (!from) {
        from = await new Promise<{ lat: number; lng: number }>(
          (resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              (position) =>
                resolve({
                  lat: position.coords.latitude,
                  lng: position.coords.longitude,
                }),
              () => reject(new Error(t("place.locationNeeded"))),
              { enableHighAccuracy: true, timeout: 10_000 }
            )
          }
        )
        setUserLocation(from)
      }

      const route = await fetchWalkingRoute(from, {
        lat: selectedPlace.lat,
        lng: selectedPlace.lng,
      })

      drawRoute(mapInstance, route)
      setRouteSummary(
        formatRouteSummary(route, {
          locale,
          units: {
            km: t("units.km"),
            m: t("units.m"),
            min: t("units.min"),
          },
        })
      )
    } catch (error) {
      if (error instanceof Error && isRouteErrorCode(error.message)) {
        const key = (
          {
            route_request_failed: "place.routeRequestFailed",
            route_not_found: "place.routeNotFound",
            route_aborted: "place.routeAborted",
          } as const satisfies Record<string, MessageKey>
        )[error.message]
        setRouteError(t(key))
      } else if (
        error instanceof Error &&
        error.message === t("place.locationNeeded")
      ) {
        setRouteError(error.message)
      } else {
        setRouteError(t("place.routeError"))
      }
    } finally {
      setRouteLoading(false)
    }
  }, [locale, mapInstance, selectedPlace, t, userLocation])

  const visiblePlaces = useMemo(() => {
    if (activeLabelIds.length === 0) {
      return mapPlaces
    }

    return mapPlaces.filter((place) =>
      (place.labelIds ?? []).some((labelId) => activeLabelIds.includes(labelId))
    )
  }, [activeLabelIds, mapPlaces])

  const placeCounts = useMemo(() => {
    const counts: Partial<Record<PlaceCategoryId, number>> = {}

    for (const place of visiblePlaces) {
      counts[place.category] = (counts[place.category] ?? 0) + 1
    }

    return counts
  }, [visiblePlaces])

  const labelCounts = useMemo(() => {
    const counts: Record<string, number> = {}

    for (const place of mapPlaces) {
      for (const labelId of place.labelIds ?? []) {
        counts[labelId] = (counts[labelId] ?? 0) + 1
      }
    }

    return counts
  }, [mapPlaces])

  const initialStyleId = isAuthenticated
    ? (savedPreferences?.mapStyleId ?? DEFAULT_MAP_STYLE_ID)
    : DEFAULT_MAP_STYLE_ID
  const isPreferenceReady =
    !isAuthLoading &&
    (isAuthenticated
      ? savedPreferences !== undefined && savedPreferences !== null
      : true)
  const sidePanelProps = {
    activeCategories,
    placeCounts,
    labels,
    activeLabelIds,
    labelCounts,
    onToggleLabel: handleToggleLabel,
    onClearLabels: () => setActiveLabelIds([]),
    sidePanelSection,
    onSidePanelSectionChange: handleSidePanelSectionChange,
    onToggleCategory: handleToggleCategory,
    onShowAllCategories: () => persistCategories([...PLACE_CATEGORIES]),
    onSelectPlace: (place: PlaceSearchResult) =>
      handleSelectPlace(place, place.query ?? place.label),
    onSelectSavedPlace: handleSelectSavedPlace,
    onRequestClose: closeSidePanel,
  }

  const placeCardLeftOffset =
    !isMobile && sidebarOpen ? "md:left-[22rem]" : "sm:left-3"

  return (
    <div className="relative h-svh min-h-0 overflow-hidden bg-muted/20">
      {isPreferenceReady ? (
        <MapView
          ref={mapRef}
          className="absolute inset-0 h-full w-full"
          initialStyleId={initialStyleId}
          onStyleChange={handleStyleChange}
          onUserLocationChange={setUserLocation}
          onMapClick={
            suggestOpen && composerMode === "point" ? setPickedPoint : undefined
          }
          onMapReady={setMapInstance}
        >
          {(map) => (
            <PlaceCategoryLayers
              map={map}
              places={visiblePlaces}
              activeCategories={activeCategories}
              selectedPlaceId={selectedPlace?._id ?? null}
              onSelectPlace={setSelectedPlace}
            />
          )}
        </MapView>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/30 text-sm text-muted-foreground">
          {t("map.loading")}
        </div>
      )}

      <MapCompactToolbar
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => handleSidebarOpenChange(!sidebarOpen)}
        onOpenSearch={() => setSearchOpen(true)}
        onAddPlace={() => {
          setSidebarOpen(false)
          setSuggestOpen(true)
        }}
      />

      {/* Desktop: float above the map without shrinking the canvas. */}
      {!isMobile && sidebarOpen ? (
        <aside className="pointer-events-none absolute top-16 bottom-3 left-3 z-20 hidden w-[20rem] md:flex">
          <div className="pointer-events-auto flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-2xl border bg-background/95 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/90">
            <MapSidePanel {...sidePanelProps} />
          </div>
        </aside>
      ) : null}

      {/* Mobile: sheet overlay (map stays full-bleed underneath). */}
      {isMobile ? (
        <Sheet open={sidebarOpen} onOpenChange={handleSidebarOpenChange}>
          <SheetContent
            side="left"
            showCloseButton={false}
            className="w-[min(100%,20rem)] gap-0 p-0"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>{t("map.search")}</SheetTitle>
              <SheetDescription>{t("map.search")}</SheetDescription>
            </SheetHeader>
            <div className="min-h-0 flex-1 overflow-hidden">
              <MapSidePanel {...sidePanelProps} />
            </div>
          </SheetContent>
        </Sheet>
      ) : null}

      {selectedPlace ? (
        <div
          className={`pointer-events-none absolute inset-x-3 bottom-3 z-10 flex max-h-[min(70%,480px)] justify-start transition-[left] duration-200 sm:inset-x-auto ${placeCardLeftOffset}`}
        >
          <PlaceCard
            key={selectedPlace._id}
            place={selectedPlace}
            labels={labels}
            onClose={handleCloseCard}
            onShowRoute={() => void handleShowRoute()}
            onClearRoute={handleClearRoute}
            routeLoading={routeLoading}
            routeSummary={routeSummary}
            routeError={routeError}
          />
        </div>
      ) : null}

      <MapSearchModal
        open={searchOpen}
        onOpenChange={setSearchOpen}
        getSearchViewport={() => mapRef.current?.getSearchViewport() ?? null}
        userLocation={userLocation}
        activeCategories={activeCategories}
        onSelectPlace={handleSelectPlace}
        onSelectLabel={handleSelectLabel}
        onCategorySelect={handleSelectCategory}
        catalogPlaces={catalogPlaces}
        labelOptions={labelOptions}
      />

      <SuggestPlaceDialog
        open={suggestOpen}
        onOpenChange={(next) => {
          setSuggestOpen(next)
          if (!next) {
            setPickedPoint(null)
            setComposerMode("point")
          }
        }}
        labels={labels}
        isAdmin={isAdmin}
        map={mapInstance}
        pickedPoint={pickedPoint}
        geometryMode={composerMode}
        onGeometryModeChange={setComposerMode}
      />
    </div>
  )
}
