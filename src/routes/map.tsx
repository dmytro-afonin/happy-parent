"use client"

import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useConvexAuth, useMutation, useQuery } from "convex/react"
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"

import { MapCompactToolbar } from "@/components/map/MapCompactToolbar"
import { MapSearchModal } from "@/components/map/MapSearchModal"
import { MapSidePanel } from "@/components/map/MapSidePanel"
import { MapView, type MapViewHandle } from "@/components/map/MapView"
import {
  PlaceCategoryLayers,
  type MapPlace,
} from "@/components/map/PlaceCategoryLayers"
import {
  DEFAULT_MAP_STYLE_ID,
  type MapStyleId,
} from "@/components/map/map-styles"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarRail,
} from "@/components/ui/sidebar"
import type { PlaceSearchResult } from "@/lib/place-search"
import {
  isPlaceCategoryId,
  PLACE_CATEGORIES,
  type PlaceCategoryId,
} from "@/lib/place-categories"
import type { SidePanelSection } from "@/lib/map-preferences"
import { api } from "../../convex/_generated/api"

type MapSearchParams = {
  category?: PlaceCategoryId
}

export const Route = createFileRoute("/map")({
  validateSearch: (search: Record<string, unknown>): MapSearchParams => ({
    category:
      typeof search.category === "string" &&
      isPlaceCategoryId(search.category)
        ? search.category
        : undefined,
  }),
  component: MapPage,
})

function MapPage() {
  const { category: urlCategory } = Route.useSearch()
  const navigate = useNavigate()
  const mapRef = useRef<MapViewHandle>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [activeCategories, setActiveCategories] = useState<PlaceCategoryId[]>(
    () => (urlCategory ? [urlCategory] : [...PLACE_CATEGORIES]),
  )
  const [sidePanelSection, setSidePanelSection] =
    useState<SidePanelSection>("categories")
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [userLocation, setUserLocation] = useState<{
    lat: number
    lng: number
  } | null>(null)
  const uiPrefsHydratedRef = useRef(false)

  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth()
  const isAuthenticatedRef = useRef(isAuthenticated)
  isAuthenticatedRef.current = isAuthenticated
  const systemPlaces = useQuery(api.places.list, {})
  const savedPreferences = useQuery(
    api.mapPreferences.getPreferences,
    isAuthenticated ? {} : "skip",
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
    void navigate({ to: "/map", replace: true })
  }, [navigate])

  // URL category takes precedence (e.g. home page deep links).
  useLayoutEffect(() => {
    if (urlCategory) {
      setActiveCategories([urlCategory])
    }
  }, [urlCategory])

  // Saved preferences when URL is not steering category layers.
  useLayoutEffect(() => {
    if (!isAuthenticated) {
      uiPrefsHydratedRef.current = false
      return
    }

    if (savedPreferences === undefined || savedPreferences === null) {
      return
    }

    if (uiPrefsHydratedRef.current) {
      return
    }

    if (!urlCategory) {
      setActiveCategories(savedPreferences.activeCategories)
    }

    setSidePanelSection(savedPreferences.sidePanelSection)
    setSidebarOpen(savedPreferences.sidebarOpen)
    uiPrefsHydratedRef.current = true
  }, [isAuthenticated, savedPreferences, urlCategory])

  const persistCategories = useCallback(
    (
      updater:
        | PlaceCategoryId[]
        | ((current: PlaceCategoryId[]) => PlaceCategoryId[]),
      options?: { clearUrl?: boolean },
    ) => {
      setActiveCategories((current) => {
        const next =
          typeof updater === "function" ? updater(current) : updater
        if (isAuthenticatedRef.current) {
          void updatePreferences({ activeCategories: next })
        }
        return next
      })

      if (options?.clearUrl !== false && urlCategory) {
        clearCategorySearchParam()
      }
    },
    [clearCategorySearchParam, updatePreferences, urlCategory],
  )

  const handleStyleChange = useCallback(
    (styleId: MapStyleId) => {
      if (!isAuthenticated) {
        return
      }

      void updatePreferences({ mapStyleId: styleId })
    },
    [isAuthenticated, updatePreferences],
  )

  const handleSelectCategory = useCallback(
    (category: PlaceCategoryId) => {
      persistCategories([category])
      if (isAuthenticated) {
        void recordRecentCategory({ category })
      }
    },
    [isAuthenticated, persistCategories, recordRecentCategory],
  )

  const handleSelectPlace = useCallback(
    (place: PlaceSearchResult, query: string) => {
      mapRef.current?.flyTo({ lat: place.lat, lng: place.lng })

      if (isAuthenticated) {
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
    [isAuthenticated, recordRecentSearch],
  )

  const handleToggleCategory = useCallback(
    (category: PlaceCategoryId) => {
      persistCategories((current) =>
        current.includes(category)
          ? current.filter((entry) => entry !== category)
          : [...current, category],
      )
    },
    [persistCategories],
  )

  const handleSidePanelSectionChange = useCallback(
    (section: SidePanelSection | undefined) => {
      const nextSection = section ?? "categories"
      setSidePanelSection(nextSection)
      if (isAuthenticated) {
        void updatePreferences({ sidePanelSection: nextSection })
      }
    },
    [isAuthenticated, updatePreferences],
  )

  const handleSidebarOpenChange = useCallback(
    (open: boolean) => {
      setSidebarOpen(open)
      if (isAuthenticated) {
        void updatePreferences({ sidebarOpen: open })
      }
    },
    [isAuthenticated, updatePreferences],
  )

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
        geometryType: place.geometryType ?? "point",
        boundary: place.boundary,
        coverPhotoUrl: place.coverPhotoUrl,
        coverPhotoThumbnailUrl: place.coverPhotoThumbnailUrl,
      })),
    [systemPlaces],
  )

  const placeCounts = useMemo(() => {
    const counts: Partial<Record<PlaceCategoryId, number>> = {}

    for (const place of mapPlaces) {
      counts[place.category] = (counts[place.category] ?? 0) + 1
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
    sidePanelSection,
    onSidePanelSectionChange: handleSidePanelSectionChange,
    onToggleCategory: handleToggleCategory,
    onShowAllCategories: () => persistCategories([...PLACE_CATEGORIES]),
    onHideAllCategories: () => persistCategories([]),
    onSelectPlace: (place: PlaceSearchResult) =>
      handleSelectPlace(place, place.query ?? place.label),
    onSelectRecentCategory: handleSelectCategory,
  }

  return (
    <SidebarProvider
      open={sidebarOpen}
      onOpenChange={handleSidebarOpenChange}
      className="h-svh min-h-0"
    >
      <Sidebar collapsible="offcanvas" variant="sidebar">
        <SidebarHeader className="border-b px-3 py-2">
          <p className="text-sm font-medium">Happy Parent</p>
          <p className="text-xs text-muted-foreground">
            Layers, saved & recent places
          </p>
        </SidebarHeader>
        <SidebarContent>
          <MapSidePanel {...sidePanelProps} />
        </SidebarContent>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="min-h-0 overflow-hidden">
        <MapCompactToolbar onOpenSearch={() => setSearchOpen(true)} />

        <div className="relative min-h-0 flex-1">
          {isPreferenceReady ? (
            <MapView
              ref={mapRef}
              className="absolute inset-0 h-full w-full"
              initialStyleId={initialStyleId}
              onStyleChange={handleStyleChange}
              onUserLocationChange={setUserLocation}
            >
              {(map) => (
                <PlaceCategoryLayers
                  map={map}
                  places={mapPlaces}
                  activeCategories={activeCategories}
                />
              )}
            </MapView>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/30 text-sm text-muted-foreground">
              Loading map…
            </div>
          )}
        </div>
      </SidebarInset>

      <MapSearchModal
        open={searchOpen}
        onOpenChange={setSearchOpen}
        getSearchViewport={() => mapRef.current?.getSearchViewport() ?? null}
        userLocation={userLocation}
        activeCategories={activeCategories}
        onSelectPlace={handleSelectPlace}
        onCategorySelect={handleSelectCategory}
      />
    </SidebarProvider>
  )
}
