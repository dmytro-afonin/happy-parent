import { v } from "convex/values"

export const SUPPORTED_LOCALES = ["en", "pl", "uk", "ru", "be"] as const

export type Locale = (typeof SUPPORTED_LOCALES)[number]

export const localeValidator = v.union(
  v.literal("en"),
  v.literal("pl"),
  v.literal("uk"),
  v.literal("ru"),
  v.literal("be")
)

export function isLocale(value: string): value is Locale {
  return SUPPORTED_LOCALES.includes(value as Locale)
}
