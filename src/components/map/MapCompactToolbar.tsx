"use client"

import { Show, SignInButton } from "@clerk/react"
import { PlusIcon, SearchIcon } from "lucide-react"

import { ReviewAlerts } from "@/components/admin/ReviewAlerts"
import { UserMenu } from "@/components/user-menu"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"

type MapCompactToolbarProps = {
  onOpenSearch: () => void
  onAddPlace: () => void
  className?: string
}

export function MapCompactToolbar({
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
        <button
          type="button"
          onClick={onOpenSearch}
          className="pointer-events-auto flex h-11 min-w-0 flex-1 items-center gap-2 rounded-full border bg-background/95 px-4 text-left text-sm shadow-md backdrop-blur hover:bg-muted/40 supports-[backdrop-filter]:bg-background/80"
        >
          <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate text-muted-foreground">
            {t("map.searchPlaceholder")}
          </span>
        </button>
        <div className="pointer-events-auto flex shrink-0 items-center gap-1">
          <ReviewAlerts />
          <UserMenu includeSpaceLinks />
        </div>
      </header>

      <div className="pointer-events-none absolute right-3 bottom-36 z-20">
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
