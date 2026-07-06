"use client"

import { useMemo } from "react"
import { useQuery } from "convex/react"

import { useI18n } from "@/lib/i18n"
import { PLACE_CATEGORY_META } from "@/lib/place-categories"
import type { PlaceCategoryId } from "@/lib/place-categories"
import { api } from "../../convex/_generated/api"
import type { Id } from "../../convex/_generated/dataModel"

export type PlaceLabel = {
  _id: Id<"labels">
  slug: string
  name: string
  category: PlaceCategoryId
}

export function useLabels(): PlaceLabel[] | undefined {
  const labels = useQuery(api.labels.list, {})
  return labels
}

/**
 * Localized names for categories and labels, backed by approved translations
 * in Convex with English base names as fallback.
 */
export function useLocalizedNames() {
  const { locale } = useI18n()
  const translations = useQuery(api.translations.listApproved, { locale })

  const byKey = useMemo(() => {
    const map = new Map<string, string>()
    for (const entry of translations ?? []) {
      map.set(`${entry.entityType}:${entry.entityKey}`, entry.value)
    }
    return map
  }, [translations])

  return useMemo(
    () => ({
      categoryName: (category: PlaceCategoryId) =>
        byKey.get(`category:${category}`) ??
        PLACE_CATEGORY_META[category].label,
      labelName: (label: { slug: string; name: string }) =>
        byKey.get(`label:${label.slug}`) ?? label.name,
    }),
    [byKey]
  )
}
