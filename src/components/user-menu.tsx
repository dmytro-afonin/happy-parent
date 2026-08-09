"use client"

import { Show, SignInButton, UserButton } from "@clerk/react"
import { Link } from "@tanstack/react-router"
import {
  CircleUserRoundIcon,
  HomeIcon,
  MapIcon,
  Moon,
  ShieldIcon,
  Sun,
} from "lucide-react"
import type { ReactNode } from "react"

import { ModeToggle } from "@/components/mode-toggle"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useAdminStatus } from "@/hooks/use-admin-status"
import { useTheme } from "@/hooks/use-theme"
import { useI18n } from "@/lib/i18n"

export type AccountNavLink = {
  label: string
  href: string
  icon: ReactNode
}

type UserMenuProps = {
  /** Extra destinations shown under the account control (map space, etc.). */
  links?: AccountNavLink[]
  /** When true, include Home / Map / Admin (if allowed) under the user control. */
  includeSpaceLinks?: boolean
}

export function UserMenu({
  links = [],
  includeSpaceLinks = false,
}: UserMenuProps) {
  const { theme, toggleTheme } = useTheme()
  const { t } = useI18n()
  const { isAdmin, isLoading: isAdminLoading } = useAdminStatus()

  const spaceLinks: AccountNavLink[] = includeSpaceLinks
    ? [
        {
          label: t("nav.home"),
          href: "/",
          icon: <HomeIcon className="size-4" />,
        },
        {
          label: t("nav.map"),
          href: "/map",
          icon: <MapIcon className="size-4" />,
        },
        ...(!isAdminLoading && isAdmin
          ? [
              {
                label: t("nav.admin"),
                href: "/admin",
                icon: <ShieldIcon className="size-4" />,
              },
            ]
          : []),
      ]
    : []

  const allLinks = [...spaceLinks, ...links]

  return (
    <>
      <Show when="signed-in">
        <UserButton>
          <UserButton.MenuItems>
            {allLinks.map((item) => (
              <UserButton.Link
                key={item.href}
                label={item.label}
                href={item.href}
                labelIcon={item.icon}
              />
            ))}
            <UserButton.Action
              label={theme === "dark" ? t("theme.light") : t("theme.dark")}
              labelIcon={
                theme === "dark" ? (
                  <Sun className="size-4" />
                ) : (
                  <Moon className="size-4" />
                )
              }
              onClick={toggleTheme}
            />
          </UserButton.MenuItems>
        </UserButton>
      </Show>
      <Show when="signed-out">
        <SignedOutAccountMenu links={allLinks} />
      </Show>
    </>
  )
}

function SignedOutAccountMenu({ links }: { links: AccountNavLink[] }) {
  const { t } = useI18n()

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9"
          aria-label={t("auth.account")}
        >
          <CircleUserRoundIcon className="size-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-1.5">
        <div className="flex flex-col gap-0.5">
          {links.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm hover:bg-muted"
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
          <div className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5">
            <span className="text-sm text-muted-foreground">
              {t("theme.label")}
            </span>
            <ModeToggle />
          </div>
          <SignInButton mode="modal">
            <Button size="sm" className="mt-1 w-full">
              {t("auth.signIn")}
            </Button>
          </SignInButton>
        </div>
      </PopoverContent>
    </Popover>
  )
}
