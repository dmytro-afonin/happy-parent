"use client"

import { LOCALE_NAMES, SUPPORTED_LOCALES, useI18n } from "@/lib/i18n"
import type { Locale } from "@/lib/i18n"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export const LOCALE_FLAGS: Record<Locale, string> = {
  en: "🇬🇧",
  pl: "🇵🇱",
  uk: "🇺🇦",
  ru: "🇷🇺",
  be: "🇧🇾",
}

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, t } = useI18n()

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn("size-9 text-lg leading-none", className)}
          aria-label={t("nav.language")}
          title={LOCALE_NAMES[locale]}
        >
          <span aria-hidden="true">{LOCALE_FLAGS[locale]}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-1">
        <ul
          className="flex flex-col gap-0.5"
          role="listbox"
          aria-label={t("nav.language")}
        >
          {SUPPORTED_LOCALES.map((entry) => {
            const selected = entry === locale
            return (
              <li key={entry}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => setLocale(entry)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-muted",
                    selected && "bg-muted font-medium"
                  )}
                >
                  <span className="text-base leading-none" aria-hidden="true">
                    {LOCALE_FLAGS[entry]}
                  </span>
                  <span>{LOCALE_NAMES[entry]}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </PopoverContent>
    </Popover>
  )
}
