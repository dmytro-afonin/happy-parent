"use client"

import { Show, SignInButton } from "@clerk/react"
import { PanelLeftIcon, PlusIcon, XIcon } from "lucide-react"

import { LanguageSwitcher } from "@/components/language-switcher"
import { MapSearchBar } from "@/components/map/MapSearchModal"
import { UserMenu } from "@/components/user-menu"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"

type MapCompactToolbarProps = {
  onOpenSearch: () => void
  onAddPlace: () => void
  panelOpen: boolean
  onTogglePanel: () => void
  className?: string
}

export function MapCompactToolbar({
  onOpenSearch,
  onAddPlace,
  panelOpen,
  onTogglePanel,
  className,
}: MapCompactToolbarProps) {
  const { t } = useI18n()

  return (
    <header
      className={cn(
        "pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start gap-2 p-2 sm:p-3",
        className
      )}
    >
      <div className="pointer-events-auto flex min-w-0 flex-1 items-center gap-1.5 rounded-2xl border bg-background/95 p-1.5 shadow-md backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:gap-2 sm:p-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9 shrink-0"
          aria-label={panelOpen ? t("common.close") : t("map.categories")}
          aria-expanded={panelOpen}
          onClick={onTogglePanel}
        >
          {panelOpen ? (
            <XIcon className="size-4" />
          ) : (
            <PanelLeftIcon className="size-4" />
          )}
        </Button>
        <MapSearchBar onOpenSearch={onOpenSearch} />
        <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
          <Show when="signed-in">
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-2"
              aria-label={t("map.addPlace")}
              onClick={onAddPlace}
            >
              <PlusIcon className="size-4" />
              <span className="hidden sm:inline">{t("map.addPlace")}</span>
            </Button>
          </Show>
          <Show when="signed-out">
            <SignInButton mode="modal">
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-2"
                aria-label={t("map.addPlace")}
              >
                <PlusIcon className="size-4" />
                <span className="hidden sm:inline">{t("map.addPlace")}</span>
              </Button>
            </SignInButton>
          </Show>
          <LanguageSwitcher />
          <UserMenu includeSpaceLinks />
        </div>
      </div>
    </header>
  )
}
