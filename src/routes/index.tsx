import { createFileRoute, Link } from "@tanstack/react-router"
import { MapIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { PLACE_CATEGORY_LIST } from "@/lib/place-categories"

export const Route = createFileRoute("/")({ component: HomePage })

function HomePage() {
  return (
    <main className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.18),transparent_42%),radial-gradient(circle_at_80%_20%,rgba(34,197,94,0.12),transparent_30%),linear-gradient(to_bottom,transparent,rgba(0,0,0,0.02))]" />

      <div className="container relative mx-auto flex min-h-[calc(100svh-3.5rem)] flex-col px-4 py-10 md:py-14">
        <section className="mx-auto max-w-3xl text-center">
          <p className="mb-3 text-sm font-medium tracking-wide text-primary uppercase">
            For parents, by parents
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-balance md:text-5xl">
            Find kid-friendly places near you
          </h1>
          <p className="mt-4 text-lg text-muted-foreground text-balance">
            Happy Parent helps families discover playgrounds, parks, cafés, and
            more — curated spots where kids are welcome and parents can breathe
            easy.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/map">
                <MapIcon className="size-4" />
                Explore the map
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/map" search={{ category: "playground" }}>
                Start with playgrounds
              </Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto mt-12 w-full max-w-5xl md:mt-16">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">
              Browse by category
            </h2>
            <p className="mt-2 text-muted-foreground">
              Tap a category to open the map with that layer turned on.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {PLACE_CATEGORY_LIST.map((category) => {
              const Icon = category.icon

              return (
                <Link
                  key={category.id}
                  to="/map"
                  search={{ category: category.id }}
                  className="group rounded-2xl border bg-card/80 p-4 shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
                >
                  <span
                    className="mb-3 flex size-11 items-center justify-center rounded-2xl text-white shadow-sm"
                    style={{ backgroundColor: category.color }}
                  >
                    <Icon className="size-5" />
                  </span>
                  <h3 className="font-medium">{category.label}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {category.searchHint}
                  </p>
                </Link>
              )
            })}
          </div>
        </section>
      </div>
    </main>
  )
}
