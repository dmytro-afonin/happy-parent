"use client"

import { useConvexAuth, useMutation, useQuery } from "convex/react"
import { ClockIcon, HeartIcon, LayersIcon, StarIcon, Trash2Icon } from "lucide-react"

import { CategoryLayerControl } from "@/components/map/CategoryLayerControl"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useSidebar } from "@/components/ui/sidebar"
import type { PlaceSearchResult } from "@/lib/place-search"
import type { SidePanelSection } from "@/lib/map-preferences"
import {
  PLACE_CATEGORY_LIST,
  PLACE_CATEGORY_META,
  type PlaceCategoryId,
} from "@/lib/place-categories"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"

type MapSidePanelProps = {
  activeCategories: PlaceCategoryId[]
  placeCounts: Partial<Record<PlaceCategoryId, number>>
  sidePanelSection: SidePanelSection
  onSidePanelSectionChange: (section: SidePanelSection | undefined) => void
  onToggleCategory: (category: PlaceCategoryId) => void
  onShowAllCategories: () => void
  onHideAllCategories: () => void
  onSelectPlace: (place: PlaceSearchResult) => void
  onSelectRecentCategory?: (category: PlaceCategoryId) => void
}

export function MapSidePanel({
  activeCategories,
  placeCounts,
  sidePanelSection,
  onSidePanelSectionChange,
  onToggleCategory,
  onShowAllCategories,
  onHideAllCategories,
  onSelectPlace,
  onSelectRecentCategory,
}: MapSidePanelProps) {
  const { isAuthenticated } = useConvexAuth()
  const { isMobile, setOpenMobile } = useSidebar()
  const favourites = useQuery(
    api.favouritePlaces.list,
    isAuthenticated ? {} : "skip",
  )
  const recentSearches = useQuery(
    api.recentSearches.listRecent,
    isAuthenticated ? { limit: 15 } : "skip",
  )
  const recentCategories = useQuery(
    api.recentCategories.list,
    isAuthenticated ? { limit: 6 } : "skip",
  )
  const removeFavourite = useMutation(api.favouritePlaces.remove)

  const closeMobileSidebar = () => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }

  const handleSelectPlace = (place: PlaceSearchResult) => {
    onSelectPlace(place)
    closeMobileSidebar()
  }

  const handleSelectCategory = (category: PlaceCategoryId) => {
    onSelectRecentCategory?.(category)
    closeMobileSidebar()
  }

  const handleRemove = async (favouriteId: Id<"favouritePlaces">) => {
    await removeFavourite({ favouriteId })
  }

  const activeCategoryCount = activeCategories.length

  return (
    <Accordion
      type="single"
      collapsible
      value={sidePanelSection}
      onValueChange={(value) =>
        onSidePanelSectionChange(
          value === "" ? undefined : (value as SidePanelSection),
        )
      }
      className="px-2"
    >
      <AccordionItem value="categories">
        <AccordionTrigger className="px-2 hover:no-underline">
          <span className="flex items-center gap-2">
            <LayersIcon className="size-4 text-muted-foreground" />
            Categories
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
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="my-places">
        <AccordionTrigger className="px-2 hover:no-underline">
          <span className="flex items-center gap-2">
            <HeartIcon className="size-4 text-red-500" />
            My places
            {favourites ? (
              <Badge variant="secondary" className="ml-1">
                {favourites.length}
              </Badge>
            ) : null}
          </span>
        </AccordionTrigger>
        <AccordionContent className="px-1">
          {!isAuthenticated ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">
              Sign in to save places.
            </p>
          ) : favourites === undefined ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">
              Loading…
            </p>
          ) : favourites.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">
              No saved places yet.
            </p>
          ) : (
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
                      aria-label={`Remove ${favourite.name}`}
                      onClick={() => void handleRemove(favourite._id)}
                    >
                      <Trash2Icon className="size-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="recents">
        <AccordionTrigger className="px-2 hover:no-underline">
          <span className="flex items-center gap-2">
            <ClockIcon className="size-4 text-muted-foreground" />
            Recents
            {isAuthenticated &&
            (recentSearches || recentCategories) ? (
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
              Sign in to see recents.
            </p>
          ) : recentSearches === undefined ||
            recentCategories === undefined ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">
              Loading…
            </p>
          ) : recentCategories.length === 0 && recentSearches.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">
              No recent searches yet.
            </p>
          ) : (
            <div className="space-y-3">
              {recentCategories.length > 0 ? (
                <div>
                  <p className="mb-1.5 px-1 text-xs font-medium text-muted-foreground">
                    Categories
                  </p>
                  <div className="flex flex-wrap gap-1 px-1">
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
                          onClick={() => handleSelectCategory(entry.category)}
                          className="inline-flex items-center gap-1 rounded-full border bg-muted/40 px-2 py-0.5 text-xs hover:bg-muted"
                        >
                          {Icon ? (
                            <span
                              className="flex size-4 items-center justify-center rounded-full text-white"
                              style={{ backgroundColor: meta.color }}
                            >
                              <Icon className="size-2.5" />
                            </span>
                          ) : null}
                          {meta.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : null}

              {recentSearches.length > 0 ? (
                <div>
                  <p className="mb-1.5 px-1 text-xs font-medium text-muted-foreground">
                    Places
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
