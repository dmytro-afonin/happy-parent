"use client"

import { Link } from "@tanstack/react-router"
import type { LinkProps } from "@tanstack/react-router"
import { Show, SignInButton, SignUpButton } from "@clerk/react"

import { LanguageSwitcher } from "@/components/language-switcher"
import { ModeToggle } from "@/components/mode-toggle"
import { UserMenu } from "@/components/user-menu"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useAdminStatus } from "@/hooks/use-admin-status"
import { useI18n } from "@/lib/i18n"
import type { MessageKey } from "@/lib/i18n"

const navItems: Array<{
  to: LinkProps["to"]
  labelKey: MessageKey
  exact?: boolean
}> = [
  { to: "/", labelKey: "nav.home", exact: true },
  { to: "/map", labelKey: "nav.map" },
]

export function AppHeader() {
  const { isAdmin, isLoading: isAdminLoading } = useAdminStatus()
  const { t } = useI18n()
  // Only show admin-only links after status is resolved to true.
  const showAdminLinks = !isAdminLoading && isAdmin

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center gap-4 px-4">
        <span className="font-semibold tracking-tight">Happy Parent</span>
        <Separator orientation="vertical" className="h-6" />
        <nav className="flex items-center gap-1">
          {navItems.map((item) => (
            <Button key={item.to} variant="ghost" size="sm" asChild>
              <Link
                to={item.to}
                activeOptions={{ exact: item.exact ?? false }}
                activeProps={{ className: "bg-accent text-accent-foreground" }}
              >
                {t(item.labelKey)}
              </Link>
            </Button>
          ))}
          {showAdminLinks ? (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link
                  to="/translations"
                  activeProps={{
                    className: "bg-accent text-accent-foreground",
                  }}
                >
                  {t("nav.translations")}
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link
                  to="/admin"
                  activeProps={{
                    className: "bg-accent text-accent-foreground",
                  }}
                >
                  {t("nav.admin")}
                </Link>
              </Button>
            </>
          ) : null}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <LanguageSwitcher />
          <Show when="signed-out">
            <ModeToggle />
            <SignInButton mode="modal">
              <Button variant="ghost" size="sm">
                {t("auth.signIn")}
              </Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button size="sm">{t("auth.signUp")}</Button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <UserMenu />
          </Show>
        </div>
      </div>
    </header>
  )
}
