"use client"

import { useCallback, useEffect, useSyncExternalStore } from "react"

export type Theme = "light" | "dark"

const listeners = new Set<() => void>()

function readTheme(): Theme {
  const stored = localStorage.getItem("theme")
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
  return stored === "dark" || (!stored && prefersDark) ? "dark" : "light"
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark")
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  const media = window.matchMedia("(prefers-color-scheme: dark)")
  const onMedia = () => listener()
  media.addEventListener("change", onMedia)
  return () => {
    listeners.delete(listener)
    media.removeEventListener("change", onMedia)
  }
}

function emit() {
  for (const listener of listeners) {
    listener()
  }
}

function writeTheme(next: Theme) {
  localStorage.setItem("theme", next)
  applyTheme(next)
  emit()
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, readTheme, (): Theme => "light")

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const setThemeMode = useCallback((next: Theme) => {
    writeTheme(next)
  }, [])

  const toggleTheme = useCallback(() => {
    writeTheme(readTheme() === "dark" ? "light" : "dark")
  }, [])

  return { theme, toggleTheme, setThemeMode }
}
