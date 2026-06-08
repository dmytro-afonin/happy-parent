"use client"

import { Link } from "@tanstack/react-router"
import { Show, SignInButton, UserButton } from "@clerk/react"

import { MapSearchBar } from "@/components/map/MapSearchModal"
import { ModeToggle } from "@/components/mode-toggle"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useAdminStatus } from "@/hooks/use-admin-status"

type MapCompactToolbarProps = {
  onOpenSearch: () => void
}

export function MapCompactToolbar({ onOpenSearch }: MapCompactToolbarProps) {
  const { isAdmin } = useAdminStatus()

  return (
    <header className="flex h-11 shrink-0 items-center gap-1.5 border-b bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:gap-2 sm:px-3">
      <SidebarTrigger className="shrink-0" />
      <nav className="flex shrink-0 items-center gap-0.5">
        <Button variant="ghost" size="sm" className="h-8 px-2" asChild>
          <Link to="/">Home</Link>
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className="h-8 px-2"
          asChild
        >
          <Link to="/map">Map</Link>
        </Button>
        {isAdmin ? (
          <Button variant="ghost" size="sm" className="h-8 px-2" asChild>
            <Link to="/admin">Admin</Link>
          </Button>
        ) : null}
      </nav>
      <MapSearchBar onOpenSearch={onOpenSearch} />
      <div className="ml-auto flex shrink-0 items-center gap-1">
        <ModeToggle />
        <Show when="signed-in">
          <UserButton />
        </Show>
        <Show when="signed-out">
          <SignInButton mode="modal">
            <Button variant="ghost" size="sm" className="h-8 px-2">
              Sign in
            </Button>
          </SignInButton>
        </Show>
      </div>
    </header>
  )
}
