import { Link } from "@tanstack/react-router"
import { Show, SignInButton, UserButton } from "@clerk/react"

import { ModeToggle } from "@/components/mode-toggle"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

const navItems = [
  { to: "/", label: "Home", exact: true },
  { to: "/map", label: "Map" },
] as const

export function AppHeader() {
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
                activeOptions={{ exact: "exact" in item ? item.exact : false }}
                activeProps={{ className: "bg-accent text-accent-foreground" }}
              >
                {item.label}
              </Link>
            </Button>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ModeToggle />
          <Show when="signed-in">
            <UserButton />
          </Show>
          <Show when="signed-out">
            <SignInButton mode="modal">
              <Button size="sm">Sign in</Button>
            </SignInButton>
          </Show>
        </div>
      </div>
    </header>
  )
}
