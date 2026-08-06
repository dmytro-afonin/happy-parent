"use client"

import { useState } from "react"
import { useMutation } from "convex/react"
import { Loader2Icon, TagIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useLabels } from "@/hooks/use-localized-catalog"
import {
  PLACE_CATEGORY_LIST,
  PLACE_CATEGORY_META,
} from "@/lib/place-categories"
import type { PlaceCategoryId } from "@/lib/place-categories"
import { cn } from "@/lib/utils"
import { api } from "../../../convex/_generated/api"

export function AdminLabelForm() {
  const labels = useLabels()
  const createLabel = useMutation(api.labels.create)
  const [name, setName] = useState("")
  const [category, setCategory] = useState<PlaceCategoryId>("entertainment")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    const trimmed = name.trim()
    if (trimmed.length === 0 || submitting) {
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      await createLabel({ name: trimmed, category })
      setName("")
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not create place type."
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TagIcon className="size-4" />
          Place types
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {(labels ?? []).map((label) => (
            <Badge key={label._id} variant="outline" className="gap-1">
              <span
                className="size-1.5 rounded-full"
                style={{
                  backgroundColor: PLACE_CATEGORY_META[label.category].color,
                }}
              />
              {label.name}
            </Badge>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="New place type (English name)"
            className="h-8 w-56 text-sm"
          />
          <div className="flex gap-1">
            {PLACE_CATEGORY_LIST.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => setCategory(entry.id)}
                className={cn(
                  "rounded-full border px-2 py-0.5 text-xs transition-colors",
                  category === entry.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "hover:bg-muted"
                )}
              >
                {entry.label}
              </button>
            ))}
          </div>
          <Button
            type="button"
            size="sm"
            disabled={submitting || name.trim().length === 0}
            onClick={() => void handleSubmit()}
          >
            {submitting ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              "Add place type"
            )}
          </Button>
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <p className="text-xs text-muted-foreground">
          Add translations for new place types on the Translations page —
          changes apply immediately.
        </p>
      </CardContent>
    </Card>
  )
}
