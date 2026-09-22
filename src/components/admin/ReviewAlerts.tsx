"use client"

import { BellIcon, LanguagesIcon } from "lucide-react"
import { useQuery } from "convex/react"
import { useState } from "react"

import { PlaceReviewDialog } from "@/components/admin/PlaceReviewDialog"
import { Button } from "@/components/ui/button"
import { useAdminStatus } from "@/hooks/use-admin-status"
import { useI18n } from "@/lib/i18n"
import { api } from "../../../convex/_generated/api"

export function ReviewAlerts() {
  const { t } = useI18n()
  const { isAdmin } = useAdminStatus()
  const counts = useQuery(api.review.counts, isAdmin ? {} : "skip")
  const [mode, setMode] = useState<"updates" | "translations" | null>(null)

  if (!isAdmin || !counts) {
    return null
  }

  return (
    <>
      {counts.updates > 0 ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 gap-1.5 rounded-full px-2.5"
          onClick={() => setMode("updates")}
        >
          <BellIcon className="size-4" />
          <span className="text-xs">{counts.updates}</span>
          <span className="sr-only">{t("review.updates")}</span>
        </Button>
      ) : null}
      {counts.untranslated > 0 ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 gap-1.5 rounded-full px-2.5"
          onClick={() => setMode("translations")}
        >
          <LanguagesIcon className="size-4" />
          <span className="text-xs">{counts.untranslated}</span>
          <span className="sr-only">{t("review.missingTranslations")}</span>
        </Button>
      ) : null}
      <PlaceReviewDialog
        mode={mode}
        onOpenChange={(open) => {
          if (!open) {
            setMode(null)
          }
        }}
      />
    </>
  )
}
