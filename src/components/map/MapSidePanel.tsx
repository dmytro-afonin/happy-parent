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
  LayersIcon,
  MapPinIcon,
  StarIcon,
  TagIcon,
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
import { PLACE_CATEGORY_META } from "@/lib/place-categories"
import type { PlaceCategoryId } from "@/lib/place-categories"
import { cn } from "@/lib/utils"
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
  onHideAllCategories: () => void
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
  onHideAllCategories,
  onSelectPlace,
  onSelectSavedPlace,
  onSelectRecentCategory,
  onRequestClose,
}: MapSidePanelProps) {
  const { t } = useI18n()
  const { isAuthenticated } = useConvexAuth()
  const { categoryName, labelName } = useLocalizedNames()
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

  const activeCategoryCount = activeCategories.length
  const visibleLabels = (labels ?? []).filter((label) =>
    activeCategories.includes(label.category)
  )
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
            <LayersIcon className="size-4 text-muted-foreground" />
            {t("map.categories")}
            <Badge variant="secondary" className="ml-1">
              {activeCategoryCount}
            </Badge>
          </span>
        </AccordionTrigger>
        <AccordionContent className="px-1">
          <CategoryLayerControl
            variant="panel"
            activeCategories={activeCategories}
            placeCounts={placeCounts}
            onToggleCategory={onToggleCategory}
            onShowAll={onShowAllCategories}
            onHideAll={onHideAllCategories}
          />

          <div className="px-3 pb-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                <TagIcon className="size-3.5" />
                {t("map.labels")}
              </div>
              {activeLabelIds.length > 0 ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-6 px-1.5 text-xs"
                  onClick={onClearLabels}
                >
                  {t("map.all")}
                </Button>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-1">
              {visibleLabels.map((label) => {
                const isActive = activeLabelIds.includes(label._id)
                const count = labelCounts[label._id] ?? 0

                return (
                  <button
                    key={label._id}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => onToggleLabel(label._id)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors",
                      isActive
                        ? "border-primary bg-primary/10 text-primary"
                        : "bg-muted/40 hover:bg-muted"
                    )}
                  >
                    <span
                      className="size-1.5 rounded-full"
                      style={{
                        backgroundColor:
                          PLACE_CATEGORY_META[label.category].color,
                      }}
                    />
                    {labelName(label)}
                    {count > 0 ? (
                      <span className="text-muted-foreground">{count}</span>
                    ) : null}
                  </button>
                )
              })}
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="my-places">
        <AccordionTrigger className="px-2 hover:no-underline">
          <span className="flex items-center gap-2">
            <HeartIcon className="size-4 text-red-500" />
            {t("map.myPlaces")}
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
                  <p className="mb-1.5 px-1 text-xs font-medium text-muted-foreground">
                    {t("map.savedPlaces")}
                  </p>
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
                  <p className="mb-1.5 px-1 text-xs font-medium text-muted-foreground">
                    {t("map.favourites")}
                  </p>
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
            {t("map.recents")}
            {isAuthenticated && (recentSearches || recentCategories) ? (
              <Badge variant="secondary" className="ml-1">
                {(recentCategories?.length ?? 0) +
                  (recentSearches?.length ?? 0)}
              </Badge>
            ) : null}
          </span>
        </AccordionTrigger>
        <AccordionContent className="px-1">
          {!isAuthenticated ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">
              {t("map.signInToSave")}
            </p>
          ) : recentSearches === undefined || recentCategories === undefined ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">
              {t("common.loading")}
            </p>
          ) : recentCategories.length === 0 && recentSearches.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">
              {t("map.noSaved")}
            </p>
          ) : (
            <div className="space-y-3">
              {recentCategories.length > 0 ? (
                <div>
                  <p className="mb-1.5 px-1 text-xs font-medium text-muted-foreground">
                    {t("map.categories")}
                  </p>
                  <div className="flex flex-wrap gap-1 px-1">
                    {recentCategories.map((entry) => {
                      const meta = PLACE_CATEGORY_META[entry.category]

                      return (
                        <button
                          key={`${entry.category}-${entry.searchedAt}`}
                          type="button"
                          onClick={() => handleSelectCategory(entry.category)}
                          className="inline-flex items-center gap-1 rounded-full border bg-muted/40 px-2 py-0.5 text-xs hover:bg-muted"
                        >
                          <span
                            className="size-2 rounded-full"
                            style={{ backgroundColor: meta.color }}
                          />
                          {categoryName(entry.category)}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : null}

              {recentSearches.length > 0 ? (
                <div>
                  <p className="mb-1.5 px-1 text-xs font-medium text-muted-foreground">
                    {t("map.recents")}
                  </p>
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
                </div>
              ) : null}
            </div>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
