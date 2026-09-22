"use client"

import { useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { CheckIcon, Loader2Icon, SendIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useLabels } from "@/hooks/use-localized-catalog"
import { LOCALE_NAMES, SUPPORTED_LOCALES, useI18n } from "@/lib/i18n"
import type { Locale } from "@/lib/i18n"
import { PLACE_CATEGORIES, PLACE_CATEGORY_META } from "@/lib/place-categories"
import { cn } from "@/lib/utils"
import { api } from "../../../convex/_generated/api"

export function TranslationsEditor() {
  const { t, locale } = useI18n()
  const [targetLocale, setTargetLocale] = useState<Locale>(
    locale === "en" ? "pl" : locale
  )
  const labels = useLabels()
  const approved = useQuery(api.translations.listApproved, {
    locale: targetLocale,
  })

  const approvedByKey = new Map(
    (approved ?? []).map((entry) => [
      `${entry.entityType}:${entry.entityKey}`,
      entry.value,
    ])
  )

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("translations.title")}
        </h1>
        <p className="text-muted-foreground">{t("translations.intro")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">
          {t("translations.language")}:
        </span>
        {SUPPORTED_LOCALES.map((entry) => (
          <button
            key={entry}
            type="button"
            onClick={() => setTargetLocale(entry)}
            className={cn(
              "rounded-full border px-3 py-1 text-sm transition-colors",
              targetLocale === entry
                ? "border-primary bg-primary/10 text-primary"
                : "hover:bg-muted"
            )}
          >
            {LOCALE_NAMES[entry]}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("translations.categories")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {PLACE_CATEGORIES.map((category) => (
            <TranslationRow
              key={`${targetLocale}-${category}`}
              entityType="category"
              entityKey={category}
              baseName={PLACE_CATEGORY_META[category].label}
              currentValue={approvedByKey.get(`category:${category}`)}
              locale={targetLocale}
              accentColor={PLACE_CATEGORY_META[category].color}
            />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("translations.labels")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(labels ?? []).map((label) => (
            <TranslationRow
              key={`${targetLocale}-${label._id}`}
              entityType="label"
              entityKey={label.slug}
              baseName={label.name}
              currentValue={approvedByKey.get(`label:${label.slug}`)}
              locale={targetLocale}
              accentColor={PLACE_CATEGORY_META[label.category].color}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

type TranslationRowProps = {
  entityType: "category" | "label"
  entityKey: string
  baseName: string
  currentValue: string | undefined
  locale: Locale
  accentColor: string
}

function TranslationRow({
  entityType,
  entityKey,
  baseName,
  currentValue,
  locale,
  accentColor,
}: TranslationRowProps) {
  const { t } = useI18n()
  const setTranslation = useMutation(api.translations.set)
  const [value, setValue] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    const trimmed = value.trim()
    if (trimmed.length === 0 || submitting) {
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      await setTranslation({ entityType, entityKey, locale, value: trimmed })
      setValue("")
      setSubmitted(true)
      window.setTimeout(() => setSubmitted(false), 3000)
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not save the translation."
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border p-2.5">
      <span
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: accentColor }}
      />
      <div className="min-w-32">
        <p className="text-sm font-medium">{baseName}</p>
        <p className="text-xs text-muted-foreground">{entityKey}</p>
      </div>
      <Badge variant="secondary" className="min-w-20 justify-center">
        {currentValue ?? "—"}
      </Badge>
      <div className="flex min-w-48 flex-1 items-center gap-1.5">
        <Input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={t("translations.suggestion")}
          className="h-8 text-sm"
        />
        <Button
          type="button"
          size="icon-sm"
          variant="outline"
          disabled={submitting || value.trim().length === 0}
          aria-label={t("translations.submit")}
          onClick={() => void handleSubmit()}
        >
          {submitting ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : submitted ? (
            <CheckIcon className="size-4 text-green-600" />
          ) : (
            <SendIcon className="size-4" />
          )}
        </Button>
      </div>
      {submitted ? (
        <span className="text-xs text-green-600">
          {t("translations.submitted")}
        </span>
      ) : null}
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </div>
  )
}
