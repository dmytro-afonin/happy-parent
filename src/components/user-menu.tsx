"use client"

import { UserButton } from "@clerk/react"
import { Moon, Sun } from "lucide-react"

import { useTheme } from "@/hooks/use-theme"

export function UserMenu() {
  const { theme, toggleTheme } = useTheme()

  return (
    <UserButton>
      <UserButton.MenuItems>
        <UserButton.Action
          label={theme === "dark" ? "Light mode" : "Dark mode"}
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
  )
}
