"use client"

import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { Show, SignInButton } from "@clerk/react"
import { useConvexAuth, useMutation, useQuery } from "convex/react"
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
import { api } from "../../convex/_generated/api"

export const Route = createFileRoute("/translations")({
  component: TranslationsPage,
})

function TranslationsPage() {
  const { t, locale } = useI18n()
  const { isAuthenticated } = useConvexAuth()
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
    <main className="container mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          {t("translations.title")}
        </h1>
        <p className="text-muted-foreground">{t("translations.intro")}</p>
        {!isAuthenticated ? (
          <p className="text-sm text-muted-foreground">
            <Show when="signed-out">
              <SignInButton mode="modal">
                <button type="button" className="underline">
                  {t("translations.signIn")}
                </button>
              </SignInButton>
            </Show>
          </p>
        ) : null}
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
              key={category}
              entityType="category"
              entityKey={category}
              baseName={PLACE_CATEGORY_META[category].label}
              currentValue={approvedByKey.get(`category:${category}`)}
              locale={targetLocale}
              canSuggest={isAuthenticated}
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
              key={label._id}
              entityType="label"
              entityKey={label.slug}
              baseName={label.name}
              currentValue={approvedByKey.get(`label:${label.slug}`)}
              locale={targetLocale}
              canSuggest={isAuthenticated}
              accentColor={PLACE_CATEGORY_META[label.category].color}
            />
          ))}
        </CardContent>
      </Card>
    </main>
  )
}

type TranslationRowProps = {
  entityType: "category" | "label"
  entityKey: string
  baseName: string
  currentValue: string | undefined
  locale: Locale
  canSuggest: boolean
  accentColor: string
}

function TranslationRow({
  entityType,
  entityKey,
  baseName,
  currentValue,
  locale,
  canSuggest,
  accentColor,
}: TranslationRowProps) {
  const { t } = useI18n()
  const suggest = useMutation(api.translations.suggest)
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
      await suggest({ entityType, entityKey, locale, value: trimmed })
      setValue("")
      setSubmitted(true)
      window.setTimeout(() => setSubmitted(false), 3000)
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not submit suggestion."
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
      {canSuggest ? (
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
      ) : null}
      {submitted ? (
        <span className="text-xs text-green-600">
          {t("translations.submitted")}
        </span>
      ) : null}
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </div>
  )
}
