"use client"

import { useState } from "react"
import { ChevronDownIcon } from "lucide-react"

import { useLocalizedNames } from "@/hooks/use-localized-catalog"
import type { PlaceLabel } from "@/hooks/use-localized-catalog"
import { cn } from "@/lib/utils"
import { PLACE_CATEGORY_LIST } from "@/lib/place-categories"
import type { PlaceCategoryId } from "@/lib/place-categories"

type CategoryLayerControlProps = {
  activeCategories: PlaceCategoryId[]
  placeCounts: Partial<Record<PlaceCategoryId, number>>
  labels: PlaceLabel[] | undefined
  activeLabelIds: string[]
  labelCounts: Record<string, number>
  onToggleCategory: (category: PlaceCategoryId) => void
  onToggleLabel: (labelId: string) => void
  className?: string
}

export function CategoryLayerControl({
  activeCategories,
  placeCounts,
  labels,
  activeLabelIds,
  labelCounts,
  onToggleCategory,
  onToggleLabel,
  className,
}: CategoryLayerControlProps) {
  const { categoryName, labelName } = useLocalizedNames()
  const [expanded, setExpanded] = useState<PlaceCategoryId[]>([])

  const toggleExpanded = (category: PlaceCategoryId) => {
    setExpanded((current) =>
      current.includes(category)
        ? current.filter((entry) => entry !== category)
        : [...current, category]
    )
  }

  return (
    <div className={cn("space-y-1 p-1", className)}>
      {PLACE_CATEGORY_LIST.map((category) => {
        const Icon = category.icon
        const isActive = activeCategories.includes(category.id)
        const isOpen = expanded.includes(category.id)
        const categoryLabels = (labels ?? []).filter(
          (label) => label.category === category.id
        )
        const count = placeCounts[category.id] ?? 0

        return (
          <div key={category.id} className="rounded-lg">
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-pressed={isActive}
                onClick={() => onToggleCategory(category.id)}
                className={cn(
                  "flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-2 text-left text-sm",
                  isActive
                    ? "bg-foreground text-background shadow-sm"
                    : "bg-foreground/5 text-foreground hover:bg-foreground/10"
                )}
              >
                <span
                  className="flex size-7 shrink-0 items-center justify-center rounded-full text-white"
                  style={{ backgroundColor: category.color }}
                >
                  <Icon className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1 truncate font-medium">
                  {categoryName(category.id)}
                </span>
                <span
                  className={cn(
                    "text-xs tabular-nums",
                    isActive ? "text-background/70" : "text-muted-foreground"
                  )}
                >
                  {count}
                </span>
              </button>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-label={categoryName(category.id)}
                onClick={() => toggleExpanded(category.id)}
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
              >
                <ChevronDownIcon
                  className={cn(
                    "size-4 transition-transform",
                    isOpen && "rotate-180"
                  )}
                />
              </button>
            </div>
            {isOpen ? (
              <div className="flex flex-wrap gap-1.5 px-2 pt-1 pb-2">
                {categoryLabels.map((label) => {
                  const selected = activeLabelIds.includes(label._id)
                  const labelCount = labelCounts[label._id] ?? 0
                  return (
                    <button
                      key={label._id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => onToggleLabel(label._id)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm",
                        selected
                          ? "border-foreground bg-foreground text-background"
                          : "border-foreground/20 bg-transparent text-foreground hover:bg-foreground/10"
                      )}
                    >
                      {labelName(label)}
                      {labelCount > 0 ? (
                        <span className="text-xs text-muted-foreground">
                          {labelCount}
                        </span>
                      ) : null}
                    </button>
                  )
                })}
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
