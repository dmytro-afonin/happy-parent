"use client"

import { Show, SignInButton } from "@clerk/react"
import { PanelLeftIcon, PlusIcon, SearchIcon } from "lucide-react"

import { ReviewAlerts } from "@/components/admin/ReviewAlerts"
import { UserMenu } from "@/components/user-menu"
import { Button } from "@/components/ui/button"
import { MAP_STYLES } from "@/components/map/map-styles"
import type { MapStyleId } from "@/components/map/map-styles"
import { useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"

type MapCompactToolbarProps = {
  sidebarOpen: boolean
  onToggleSidebar: () => void
  mapStyleId: MapStyleId
  onMapStyleChange: (styleId: MapStyleId) => void
  onOpenSearch: () => void
  onAddPlace: () => void
  className?: string
}

export function MapCompactToolbar({
  sidebarOpen,
  onToggleSidebar,
  mapStyleId,
  onMapStyleChange,
  onOpenSearch,
  onAddPlace,
  className,
}: MapCompactToolbarProps) {
  const { t } = useI18n()

  return (
    <>
      <header
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start gap-2 p-2 sm:p-3",
          className
        )}
      >
        <Button
          type="button"
          size="icon"
          variant="secondary"
          aria-expanded={sidebarOpen}
          aria-label={t("map.viewOptions")}
          onClick={onToggleSidebar}
          className="pointer-events-auto size-11 shrink-0 rounded-full shadow-md"
        >
          <PanelLeftIcon className="size-4" />
        </Button>
        <button
          type="button"
          onClick={onOpenSearch}
          className="pointer-events-auto flex h-11 max-w-xs min-w-0 flex-1 items-center gap-2 rounded-full border bg-background/95 px-4 text-left text-sm text-foreground shadow-md backdrop-blur hover:bg-muted/40 supports-[backdrop-filter]:bg-background/80"
        >
          <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate text-muted-foreground">
            {t("map.searchPlaceholder")}
          </span>
        </button>
        <label className="pointer-events-auto flex h-11 shrink-0 items-center rounded-full border border-border bg-background px-3 text-foreground shadow-md">
          <span className="sr-only">{t("map.mapStyle")}</span>
          <select
            aria-label={t("map.mapStyle")}
            value={mapStyleId}
            onChange={(event) =>
              onMapStyleChange(event.target.value as MapStyleId)
            }
            className="h-9 bg-background text-sm text-foreground outline-none"
          >
            {MAP_STYLES.map((style) => (
              <option key={style.id} value={style.id}>
                {style.label}
              </option>
            ))}
          </select>
        </label>
        <div className="pointer-events-auto ml-auto flex shrink-0 items-center gap-1">
          <ReviewAlerts />
          <UserMenu includeSpaceLinks />
        </div>
      </header>

      <div className="pointer-events-none absolute right-[4.75rem] bottom-20 z-20">
        <Show when="signed-in">
          <Button
            type="button"
            size="icon"
            className="pointer-events-auto size-12 rounded-full shadow-lg"
            aria-label={t("map.addPlace")}
            onClick={onAddPlace}
          >
            <PlusIcon className="size-5" />
          </Button>
        </Show>
        <Show when="signed-out">
          <SignInButton mode="modal">
            <Button
              type="button"
              size="icon"
              className="pointer-events-auto size-12 rounded-full shadow-lg"
              aria-label={t("map.addPlace")}
            >
              <PlusIcon className="size-5" />
            </Button>
          </SignInButton>
        </Show>
      </div>
    </>
  )
}
