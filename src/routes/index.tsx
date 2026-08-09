import { createFileRoute, Link } from "@tanstack/react-router"
import { Show, SignInButton } from "@clerk/react"
import { MapIcon, ShieldIcon } from "lucide-react"

import { LanguageSwitcher } from "@/components/language-switcher"
import { UserMenu } from "@/components/user-menu"
import { Button } from "@/components/ui/button"
import { useAdminStatus } from "@/hooks/use-admin-status"
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
  const { isAdmin, isLoading: isAdminLoading } = useAdminStatus()
  const showAdminCta = !isAdminLoading && isAdmin

  const categoryHintKey = (id: PlaceCategoryId): MessageKey =>
    `home.categoryHint.${id}` as MessageKey

  return (
    <main className="relative min-h-svh overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.18),transparent_42%),radial-gradient(circle_at_80%_20%,rgba(34,197,94,0.12),transparent_30%),linear-gradient(to_bottom,transparent,rgba(0,0,0,0.02))]" />

      <header className="relative z-10 flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <span className="sr-only">{t("home.brand")}</span>
        <div className="ml-auto flex items-center gap-1">
          <LanguageSwitcher />
          <Show when="signed-out">
            <SignInButton mode="modal">
              <Button variant="ghost" size="sm">
                {t("auth.signIn")}
              </Button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <UserMenu />
          </Show>
        </div>
      </header>

      <div className="relative container mx-auto flex flex-col px-4 pt-2 pb-12 sm:px-6 md:pt-6 md:pb-16">
        <section className="mx-auto max-w-3xl text-center">
          <p className="mb-2 text-sm font-medium tracking-wide text-primary uppercase">
            {t("home.tagline")}
          </p>
          <h1 className="font-semibold tracking-tight text-balance">
            <span className="block text-4xl sm:text-5xl md:text-6xl">
              {t("home.brand")}
            </span>
            <span className="mt-3 block text-xl text-muted-foreground sm:text-2xl md:text-3xl">
              {t("home.title")}
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-balance text-muted-foreground sm:text-lg">
            {t("home.subtitle")}
          </p>
          <div className="mx-auto mt-8 flex w-full max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
            <Button asChild size="lg" className="h-11 w-full sm:w-auto">
              <Link to="/map">
                <MapIcon className="size-4" />
                {t("home.exploreMap")}
              </Link>
            </Button>
            {showAdminCta ? (
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-11 w-full sm:w-auto"
              >
                <Link to="/admin">
                  <ShieldIcon className="size-4" />
                  {t("home.openAdmin")}
                </Link>
              </Button>
            ) : null}
          </div>
        </section>

        <Show when="signed-out">
          <section className="mx-auto mt-10 w-full max-w-lg text-center">
            <p className="text-sm text-muted-foreground">
              {t("home.signInCta")}
            </p>
            <SignInButton mode="modal">
              <Button className="mt-3 h-11 w-full sm:w-auto" size="lg">
                {t("home.signInCtaButton")}
              </Button>
            </SignInButton>
          </section>
        </Show>

        <section className="mx-auto mt-12 w-full max-w-5xl md:mt-16">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">
              {t("home.browseCategories")}
            </h2>
            <p className="mt-2 text-muted-foreground">
              {t("home.categoriesHint")}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
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
                  className="group rounded-2xl border bg-card/80 p-4 shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md sm:p-5"
                >
                  <span
                    className="mb-3 flex size-11 items-center justify-center rounded-2xl text-white shadow-sm sm:size-12"
                    style={{ backgroundColor: category.color }}
                  >
                    <Icon className="size-5 sm:size-6" />
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
