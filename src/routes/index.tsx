import { createFileRoute, Link } from "@tanstack/react-router"
import { MapIcon, PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useLabels, useLocalizedNames } from "@/hooks/use-localized-catalog"
import { useI18n } from "@/lib/i18n"
import type { MessageKey } from "@/lib/i18n"
import {
  PLACE_CATEGORY_LIST,
  PLACE_CATEGORY_META,
} from "@/lib/place-categories"
import type { PlaceCategoryId } from "@/lib/place-categories"

export const Route = createFileRoute("/")({ component: HomePage })

function HomePage() {
  const { t } = useI18n()
  const labels = useLabels()
  const { categoryName, labelName } = useLocalizedNames()

  const categoryHintKey = (id: PlaceCategoryId): MessageKey =>
    `home.categoryHint.${id}` as MessageKey

  return (
    <main className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.18),transparent_42%),radial-gradient(circle_at_80%_20%,rgba(34,197,94,0.12),transparent_30%),linear-gradient(to_bottom,transparent,rgba(0,0,0,0.02))]" />

      <div className="relative container mx-auto flex min-h-[calc(100svh-3.5rem)] flex-col px-4 py-10 md:py-14">
        <section className="mx-auto max-w-3xl text-center">
          <p className="mb-3 text-sm font-medium tracking-wide text-primary uppercase">
            {t("home.tagline")}
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-balance md:text-5xl">
            {t("home.title")}
          </h1>
          <p className="mt-4 text-lg text-balance text-muted-foreground">
            {t("home.subtitle")}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/map">
                <MapIcon className="size-4" />
                {t("home.exploreMap")}
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/map">
                <PlusIcon className="size-4" />
                {t("home.suggestPlace")}
              </Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto mt-12 w-full max-w-5xl md:mt-16">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">
              {t("home.browseCategories")}
            </h2>
            <p className="mt-2 text-muted-foreground">
              {t("home.categoriesHint")}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {PLACE_CATEGORY_LIST.map((category) => {
              const Icon = category.icon
              const categoryLabels = (labels ?? []).filter(
                (label) => label.category === category.id
              )

              return (
                <Link
                  key={category.id}
                  to="/map"
                  search={{ category: category.id }}
                  className="group rounded-2xl border bg-card/80 p-5 shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
                >
                  <span
                    className="mb-3 flex size-12 items-center justify-center rounded-2xl text-white shadow-sm"
                    style={{ backgroundColor: category.color }}
                  >
                    <Icon className="size-6" />
                  </span>
                  <h3 className="text-lg font-medium">
                    {categoryName(category.id)}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t(categoryHintKey(category.id))}
                  </p>
                  {categoryLabels.length > 0 ? (
                    <p className="mt-3 line-clamp-2 text-xs text-muted-foreground/80">
                      {categoryLabels
                        .map((label) => labelName(label))
                        .join(" · ")}
                    </p>
                  ) : null}
                </Link>
              )
            })}
          </div>
        </section>

        <section className="mx-auto mt-12 w-full max-w-5xl">
          <div className="mb-4 text-center">
            <h2 className="text-xl font-semibold tracking-tight">
              {t("home.browseLabels")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("home.labelsHint")}
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {(labels ?? []).map((label) => (
              <Link
                key={label._id}
                to="/map"
                search={{ label: label.slug }}
                className="inline-flex items-center gap-1.5 rounded-full border bg-card/80 px-3 py-1.5 text-sm shadow-sm transition-colors hover:border-primary/40 hover:bg-muted"
              >
                <span
                  className="size-2 rounded-full"
                  style={{
                    backgroundColor: PLACE_CATEGORY_META[label.category].color,
                  }}
                />
                {labelName(label)}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
