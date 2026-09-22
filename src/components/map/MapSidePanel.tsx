"use client"

import {
  useConvexAuth,
  useMutation,
  usePaginatedQuery,
  useQuery,
} from "convex/react"
import {
  ClockIcon,
  HeartIcon,
  MapPinIcon,
  SearchIcon,
  StarIcon,
  Trash2Icon,
} from "lucide-react"

import { CategoryLayerControl } from "@/components/map/CategoryLayerControl"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useLocalizedNames } from "@/hooks/use-localized-catalog"
import type { PlaceLabel } from "@/hooks/use-localized-catalog"
import { useI18n } from "@/lib/i18n"
import type { PlaceSearchResult } from "@/lib/place-search"
import type { SidePanelSection } from "@/lib/map-preferences"
import type { PlaceCategoryId } from "@/lib/place-categories"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"

type MapSidePanelProps = {
  activeCategories: PlaceCategoryId[]
  placeCounts: Partial<Record<PlaceCategoryId, number>>
  labels: PlaceLabel[] | undefined
  activeLabelIds: string[]
  labelCounts: Record<string, number>
  onToggleLabel: (labelId: string) => void
  onClearLabels: () => void
  sidePanelSection: SidePanelSection
  onSidePanelSectionChange: (section: SidePanelSection | undefined) => void
  onToggleCategory: (category: PlaceCategoryId) => void
  onShowAllCategories: () => void
  onSelectPlace: (place: PlaceSearchResult) => void
  onSelectSavedPlace: (placeId: string) => void
  onSelectRecentCategory?: (category: PlaceCategoryId) => void
  /** Close the floating/mobile panel after a navigation action. */
  onRequestClose?: () => void
}

export function MapSidePanel({
  activeCategories,
  placeCounts,
  labels,
  activeLabelIds,
  labelCounts,
  onToggleLabel,
  onClearLabels,
  sidePanelSection,
  onSidePanelSectionChange,
  onToggleCategory,
  onShowAllCategories,
  onSelectPlace,
  onSelectSavedPlace,
  onSelectRecentCategory,
  onRequestClose,
}: MapSidePanelProps) {
  const { t } = useI18n()
  const { isAuthenticated } = useConvexAuth()
  const { categoryName } = useLocalizedNames()
  const favourites = useQuery(
    api.favouritePlaces.list,
    isAuthenticated ? {} : "skip"
  )
  const {
    results: savedPlaces,
    status: savedPlacesStatus,
    loadMore: loadMoreSavedPlaces,
  } = usePaginatedQuery(api.savedPlaces.list, isAuthenticated ? {} : "skip", {
    initialNumItems: 20,
  })
  const recentSearches = useQuery(
    api.recentSearches.listRecent,
    isAuthenticated ? { limit: 15 } : "skip"
  )
  const recentCategories = useQuery(
    api.recentCategories.list,
    isAuthenticated ? { limit: 6 } : "skip"
  )
  const removeFavourite = useMutation(api.favouritePlaces.remove)
  const toggleSavedPlace = useMutation(api.savedPlaces.toggle)

  const handleSelectPlace = (place: PlaceSearchResult) => {
    onSelectPlace(place)
    onRequestClose?.()
  }

  const handleSelectCategory = (category: PlaceCategoryId) => {
    onSelectRecentCategory?.(category)
    onRequestClose?.()
  }

  const handleRemove = async (favouriteId: Id<"favouritePlaces">) => {
    await removeFavourite({ favouriteId })
  }

  const savedPlacesHasMore =
    savedPlacesStatus === "CanLoadMore" || savedPlacesStatus === "LoadingMore"
  const savedCountValue = (favourites?.length ?? 0) + savedPlaces.length
  const savedCountLabel = `${savedCountValue}${savedPlacesHasMore ? "+" : ""}`

  return (
    <Accordion
      type="single"
      collapsible
      value={sidePanelSection}
      onValueChange={(value) =>
        onSidePanelSectionChange(
          value === "" ? undefined : (value as SidePanelSection)
        )
      }
      className="px-2"
    >
      <AccordionItem value="categories">
        <AccordionTrigger className="px-2 hover:no-underline">
          <span className="flex items-center gap-2">
            <SearchIcon className="size-4 text-muted-foreground" />
            {t("map.search")}
          </span>
        </AccordionTrigger>
        <AccordionContent className="px-1">
          {recentCategories && recentCategories.length > 0 ? (
            <div className="mb-2 flex flex-wrap gap-1.5 px-2">
              {recentCategories.map((entry) => (
                <button
                  key={`${entry.category}-${entry.searchedAt}`}
                  type="button"
                  onClick={() => handleSelectCategory(entry.category)}
                  className="rounded-full border bg-muted/40 px-3 py-1 text-sm hover:bg-muted"
                >
                  {categoryName(entry.category)}
                </button>
              ))}
            </div>
          ) : null}
          <CategoryLayerControl
            activeCategories={activeCategories}
            placeCounts={placeCounts}
            labels={labels}
            activeLabelIds={activeLabelIds}
            labelCounts={labelCounts}
            onToggleCategory={onToggleCategory}
            onToggleLabel={onToggleLabel}
            onShowAll={onShowAllCategories}
          />
          {activeLabelIds.length > 0 ? (
            <div className="px-2 pb-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={onClearLabels}
              >
                {t("map.all")}
              </Button>
            </div>
          ) : null}
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="my-places">
        <AccordionTrigger className="px-2 hover:no-underline">
          <span className="flex items-center gap-2">
            <HeartIcon className="size-4 text-red-500" />
            {t("map.favourites")}
            {isAuthenticated ? (
              <Badge variant="secondary" className="ml-1">
                {savedCountLabel}
              </Badge>
            ) : null}
          </span>
        </AccordionTrigger>
        <AccordionContent className="px-1">
          {!isAuthenticated ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">
              {t("map.signInToSave")}
            </p>
          ) : favourites === undefined ||
            savedPlacesStatus === "LoadingFirstPage" ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">
              {t("common.loading")}
            </p>
          ) : savedCountValue === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">
              {t("map.noSaved")}
            </p>
          ) : (
            <div className="space-y-3">
              {savedPlaces.length > 0 ? (
                <div>
                  <ul className="space-y-1">
                    {savedPlaces.map((entry) => (
                      <li key={entry._id}>
                        <div className="group flex items-start gap-1 rounded-lg px-1 py-1.5 hover:bg-sidebar-accent">
                          <button
                            type="button"
                            className="flex min-w-0 flex-1 items-center gap-2 text-left"
                            onClick={() => {
                              onSelectSavedPlace(entry.placeId)
                              onRequestClose?.()
                            }}
                          >
                            <MapPinIcon className="size-4 shrink-0 text-muted-foreground" />
                            <span className="truncate text-sm font-medium">
                              {entry.placeName ?? "…"}
                            </span>
                          </button>
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            className="opacity-0 group-hover:opacity-100"
                            aria-label={t("map.removeSaved")}
                            onClick={() =>
                              void toggleSavedPlace({ placeId: entry.placeId })
                            }
                          >
                            <Trash2Icon className="size-4" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                  {savedPlacesStatus === "CanLoadMore" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="mt-1 w-full text-xs"
                      onClick={() => loadMoreSavedPlaces(20)}
                    >
                      {t("map.loadMore")}
                    </Button>
                  ) : null}
                </div>
              ) : null}

              {favourites.length > 0 ? (
                <div>
                  <ul className="space-y-1">
                    {favourites.map((favourite) => (
                      <li key={favourite._id}>
                        <div className="group flex items-start gap-1 rounded-lg px-1 py-1.5 hover:bg-sidebar-accent">
                          <button
                            type="button"
                            className="min-w-0 flex-1 text-left"
                            onClick={() =>
                              handleSelectPlace({
                                id: `favourite:${favourite._id}`,
                                label: favourite.label,
                                subtitle: favourite.subtitle,
                                lat: favourite.lat,
                                lng: favourite.lng,
                                source: "recent",
                                externalId: favourite.externalId,
                              })
                            }
                          >
                            <div className="truncate text-sm font-medium">
                              {favourite.name}
                            </div>
                            <div className="truncate text-xs text-muted-foreground">
                              {favourite.subtitle ?? favourite.label}
                            </div>
                          </button>
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            className="opacity-0 group-hover:opacity-100"
                            aria-label={t("map.removeFavourite")}
                            onClick={() => void handleRemove(favourite._id)}
                          >
                            <Trash2Icon className="size-4" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="recents">
        <AccordionTrigger className="px-2 hover:no-underline">
          <span className="flex items-center gap-2">
            <ClockIcon className="size-4 text-muted-foreground" />
            {t("map.history")}
            {isAuthenticated && recentSearches ? (
              <Badge variant="secondary" className="ml-1">
                {recentSearches.length}
              </Badge>
            ) : null}
          </span>
        </AccordionTrigger>
        <AccordionContent className="px-1">
          {!isAuthenticated ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">
              {t("map.signInToSave")}
            </p>
          ) : recentSearches === undefined ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">
              {t("common.loading")}
            </p>
          ) : recentSearches.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">
              {t("map.noSaved")}
            </p>
          ) : (
            <ul className="space-y-1">
              {recentSearches.map((entry) => (
                <li key={entry._id}>
                  <button
                    type="button"
                    className="flex w-full items-start gap-2 rounded-lg px-1 py-1.5 text-left hover:bg-sidebar-accent"
                    onClick={() =>
                      handleSelectPlace({
                        id: `recent:${entry._id}`,
                        label: entry.label,
                        subtitle: entry.subtitle,
                        lat: entry.lat,
                        lng: entry.lng,
                        source: "recent",
                        query: entry.query,
                        externalId: entry.externalId,
                      })
                    }
                  >
                    <StarIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {entry.label}
                      </span>
                      {entry.subtitle ? (
                        <span className="block truncate text-xs text-muted-foreground">
                          {entry.subtitle}
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
