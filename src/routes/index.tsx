import { createFileRoute, Link } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export const Route = createFileRoute("/")({ component: HomePage })

function HomePage() {
  return (
    <main className="container mx-auto flex min-h-[calc(100svh-3.5rem)] flex-col gap-6 p-6">
      <div className="max-w-2xl space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Happy Parent</h1>
        <p className="text-muted-foreground">
          Discover and save family-friendly places on an interactive map.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Explore the map</CardTitle>
            <CardDescription>
              MapLibre shell with sidebar layout — search and routing come later.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/map">Open map</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Stack</CardTitle>
            <CardDescription>
              TanStack Start, shadcn/ui, Clerk, Convex, Vercel + Nitro.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Copy <code className="rounded bg-muted px-1">.env.example</code> to{" "}
            <code className="rounded bg-muted px-1">.env.local</code>, then run{" "}
            <code className="rounded bg-muted px-1">pnpm dev</code> and{" "}
            <code className="rounded bg-muted px-1">pnpm dlx convex dev</code>.
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
