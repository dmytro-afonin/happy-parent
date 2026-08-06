"use client"

import { Link } from "@tanstack/react-router"
import { Show, SignInButton } from "@clerk/react"
import { PlusIcon } from "lucide-react"

import { LanguageSwitcher } from "@/components/language-switcher"
import { MapSearchBar } from "@/components/map/MapSearchModal"
import { ModeToggle } from "@/components/mode-toggle"
import { UserMenu } from "@/components/user-menu"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useAdminStatus } from "@/hooks/use-admin-status"
import { useI18n } from "@/lib/i18n"

type MapCompactToolbarProps = {
  onOpenSearch: () => void
  onAddPlace: () => void
}

export function MapCompactToolbar({
  onOpenSearch,
  onAddPlace,
}: MapCompactToolbarProps) {
  const { isAdmin, isLoading: isAdminLoading } = useAdminStatus()
  const { t } = useI18n()
  const showAdminLinks = !isAdminLoading && isAdmin

  return (
    <header className="flex h-11 shrink-0 items-center gap-1.5 border-b bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:gap-2 sm:px-3">
      <SidebarTrigger className="shrink-0" />
      <nav className="flex shrink-0 items-center gap-0.5">
        <Button variant="ghost" size="sm" className="h-8 px-2" asChild>
          <Link to="/">{t("nav.home")}</Link>
        </Button>
        <Button variant="secondary" size="sm" className="h-8 px-2" asChild>
          <Link to="/map">{t("nav.map")}</Link>
        </Button>
        {showAdminLinks ? (
          <>
            <Button variant="ghost" size="sm" className="h-8 px-2" asChild>
              <Link to="/translations">{t("nav.translations")}</Link>
            </Button>
            <Button variant="ghost" size="sm" className="h-8 px-2" asChild>
              <Link to="/admin">{t("nav.admin")}</Link>
            </Button>
          </>
        ) : null}
      </nav>
      <MapSearchBar onOpenSearch={onOpenSearch} />
      <div className="ml-auto flex shrink-0 items-center gap-1">
        <Show when="signed-in">
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2"
            onClick={onAddPlace}
          >
            <PlusIcon className="size-4" />
            <span className="hidden sm:inline">{t("map.addPlace")}</span>
          </Button>
        </Show>
        <Show when="signed-out">
          <SignInButton mode="modal">
            <Button variant="outline" size="sm" className="h-8 px-2">
              <PlusIcon className="size-4" />
              <span className="hidden sm:inline">{t("map.addPlace")}</span>
            </Button>
          </SignInButton>
        </Show>
        <LanguageSwitcher className="hidden md:flex" />
        <Show when="signed-out">
          <ModeToggle />
        </Show>
        <Show when="signed-in">
          <UserMenu />
        </Show>
        <Show when="signed-out">
          <SignInButton mode="modal">
            <Button variant="ghost" size="sm" className="h-8 px-2">
              {t("auth.signIn")}
            </Button>
          </SignInButton>
        </Show>
      </div>
    </header>
  )
}
