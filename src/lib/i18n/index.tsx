"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react"
import type { ReactNode } from "react"

import { DEFAULT_LOCALE, MESSAGES, isLocale } from "./messages"
import type { Locale, MessageKey } from "./messages"

export {
  DEFAULT_LOCALE,
  LOCALE_NAMES,
  SUPPORTED_LOCALES,
  isLocale,
} from "./messages"
export type { Locale, MessageKey } from "./messages"

const STORAGE_KEY = "happy-parent-locale"

type I18nContextValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: MessageKey) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

const localeListeners = new Set<() => void>()

function readLocale(): Locale {
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored && isLocale(stored) ? stored : DEFAULT_LOCALE
}

function subscribeLocale(listener: () => void) {
  localeListeners.add(listener)
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      listener()
    }
  }
  window.addEventListener("storage", onStorage)
  return () => {
    localeListeners.delete(listener)
    window.removeEventListener("storage", onStorage)
  }
}

function emitLocale() {
  for (const listener of localeListeners) {
    listener()
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(
    subscribeLocale,
    readLocale,
    () => DEFAULT_LOCALE
  )

  const setLocale = useCallback((next: Locale) => {
    window.localStorage.setItem(STORAGE_KEY, next)
    emitLocale()
  }, [])

  const t = useCallback((key: MessageKey) => MESSAGES[locale][key], [locale])

  const value = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t]
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider")
  }
  return context
}
