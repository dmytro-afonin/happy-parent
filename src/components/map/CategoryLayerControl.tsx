"use client"

import { useMemo } from "react"
import { LayersIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLocalizedNames } from "@/hooks/use-localized-catalog"
import { useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { PLACE_CATEGORY_LIST } from "@/lib/place-categories"
import type { PlaceCategoryId } from "@/lib/place-categories"

type CategoryLayerControlProps = {
  activeCategories: PlaceCategoryId[]
  placeCounts: Partial<Record<PlaceCategoryId, number>>
  onToggleCategory: (category: PlaceCategoryId) => void
  onShowAll: () => void
  onHideAll: () => void
  className?: string
  variant?: "overlay" | "panel"
}

export function CategoryLayerControl({
  activeCategories,
  placeCounts,
  onToggleCategory,
  onShowAll,
  onHideAll,
  className,
  variant = "overlay",
}: CategoryLayerControlProps) {
  const { locale, t } = useI18n()
  const { categoryName } = useLocalizedNames()
  const pluralRules = useMemo(() => new Intl.PluralRules(locale), [locale])

  return (
    <div
      className={cn(
        variant === "overlay"
          ? "rounded-xl border bg-background/95 p-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80"
          : "p-3",
        className
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        {variant === "overlay" ? (
          <div className="flex items-center gap-2 text-sm font-medium">
            <LayersIcon className="size-4" />
            {t("map.placeLayers")}
          </div>
        ) : (
          <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {t("map.categories")}
          </div>
        )}
        <div className="flex gap-1">
          <Button type="button" size="sm" variant="ghost" onClick={onShowAll}>
            {t("map.all")}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onHideAll}>
            {t("map.none")}
          </Button>
        </div>
      </div>

      <div
        className={cn(
          "grid gap-1 overflow-y-auto",
          variant === "overlay"
            ? "max-h-[min(40vh,320px)] sm:grid-cols-2"
            : "grid-cols-1"
        )}
      >
        {PLACE_CATEGORY_LIST.map((category) => {
          const Icon = category.icon
          const isActive = activeCategories.includes(category.id)
          const count = placeCounts[category.id] ?? 0

          const countLabel =
            pluralRules.select(count) === "one"
              ? t("map.place")
              : t("map.places")

          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onToggleCategory(category.id)}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-2 py-2 text-left text-sm transition-colors",
                isActive
                  ? "border-transparent bg-muted"
                  : "border-transparent opacity-60 hover:opacity-100"
              )}
            >
              <span
                className="flex size-7 shrink-0 items-center justify-center rounded-full text-white"
                style={{ backgroundColor: category.color }}
              >
                <Icon className="size-3.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">
                  {categoryName(category.id)}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {count} {countLabel}
                </span>
              </span>
              <span
                className={cn(
                  "size-2 shrink-0 rounded-full",
                  isActive ? "bg-primary" : "bg-muted-foreground/30"
                )}
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}
