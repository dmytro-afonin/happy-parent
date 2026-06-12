"use client"

import { useCallback, useEffect, useState } from "react"

export type Theme = "light" | "dark"

function readTheme(): Theme {
  const stored = localStorage.getItem("theme")
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
  return stored === "dark" || (!stored && prefersDark) ? "dark" : "light"
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark")
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("light")

  useEffect(() => {
    const next = readTheme()
    setTheme(next)
    applyTheme(next)
  }, [])

  const setThemeMode = useCallback((next: Theme) => {
    setTheme(next)
    localStorage.setItem("theme", next)
    applyTheme(next)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark"
      localStorage.setItem("theme", next)
      applyTheme(next)
      return next
    })
  }, [])

  return { theme, toggleTheme, setThemeMode }
}
