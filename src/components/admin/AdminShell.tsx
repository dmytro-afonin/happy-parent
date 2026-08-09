"use client"

import { Link, useRouterState } from "@tanstack/react-router"
import {
  HomeIcon,
  LanguagesIcon,
  LayoutDashboardIcon,
  MapIcon,
  MapPinIcon,
  MenuIcon,
  ShieldCheckIcon,
} from "lucide-react"
import { useState } from "react"

import { LanguageSwitcher } from "@/components/language-switcher"
import { UserMenu } from "@/components/user-menu"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useI18n } from "@/lib/i18n"
import type { MessageKey } from "@/lib/i18n"
import { cn } from "@/lib/utils"

type AdminNavItem = {
  to: "/admin" | "/admin/places" | "/admin/moderation" | "/admin/translations"
  labelKey: MessageKey
  icon: typeof LayoutDashboardIcon
  exact?: boolean
}

const NAV_ITEMS: AdminNavItem[] = [
  {
    to: "/admin",
    labelKey: "admin.nav.dashboard",
    icon: LayoutDashboardIcon,
    exact: true,
  },
  {
    to: "/admin/places",
    labelKey: "admin.nav.places",
    icon: MapPinIcon,
  },
  {
    to: "/admin/moderation",
    labelKey: "admin.nav.moderation",
    icon: ShieldCheckIcon,
  },
  {
    to: "/admin/translations",
    labelKey: "admin.nav.translations",
    icon: LanguagesIcon,
  },
]

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n()
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-svh bg-muted/20">
      <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col border-r bg-background md:flex">
        <AdminNav pathname={pathname} onNavigate={() => setMobileOpen(false)} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:px-6">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label={t("admin.menu")}
            onClick={() => setMobileOpen(true)}
          >
            <MenuIcon className="size-5" />
          </Button>
          <p className="font-semibold tracking-tight md:hidden">
            {t("admin.brand")}
          </p>
          <div className="ml-auto flex items-center gap-1">
            <LanguageSwitcher />
            <UserMenu includeSpaceLinks />
          </div>
        </header>

        <main className="flex-1 px-3 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 gap-0 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>{t("admin.menu")}</SheetTitle>
          </SheetHeader>
          <AdminNav
            pathname={pathname}
            onNavigate={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </div>
  )
}

function AdminNav({
  pathname,
  onNavigate,
}: {
  pathname: string
  onNavigate: () => void
}) {
  const { t } = useI18n()

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-4">
        <p className="text-sm font-semibold tracking-tight">
          {t("home.brand")}
        </p>
        <p className="text-xs text-muted-foreground">{t("admin.brand")}</p>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = item.exact
            ? pathname === item.to || pathname === `${item.to}/`
            : pathname === item.to || pathname.startsWith(`${item.to}/`)

          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="size-4" />
              {t(item.labelKey)}
            </Link>
          )
        })}
      </nav>

      <div className="space-y-1 border-t p-3">
        <Link
          to="/map"
          onClick={onNavigate}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <MapIcon className="size-4" />
          {t("admin.nav.map")}
        </Link>
        <Link
          to="/"
          onClick={onNavigate}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <HomeIcon className="size-4" />
          {t("admin.nav.home")}
        </Link>
      </div>
    </div>
  )
}
