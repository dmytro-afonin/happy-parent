"use client"

import { GlobeIcon } from "lucide-react"

import { LOCALE_NAMES, SUPPORTED_LOCALES, isLocale, useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, t } = useI18n()

  return (
    <label
      className={cn(
        "flex items-center gap-1 text-sm text-muted-foreground",
        className
      )}
    >
      <GlobeIcon className="size-4" />
      <select
        aria-label={t("nav.language")}
        value={locale}
        onChange={(event) => {
          if (isLocale(event.target.value)) {
            setLocale(event.target.value)
          }
        }}
        className="h-8 rounded-md border bg-background px-1.5 text-sm"
      >
        {SUPPORTED_LOCALES.map((entry) => (
          <option key={entry} value={entry}>
            {LOCALE_NAMES[entry]}
          </option>
        ))}
      </select>
    </label>
  )
}
