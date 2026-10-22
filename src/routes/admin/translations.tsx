"use client"

import { createFileRoute } from "@tanstack/react-router"

import { TranslationsEditor } from "@/components/admin/TranslationsEditor"

export const Route = createFileRoute("/admin/translations")({
  component: AdminTranslationsPage,
})

function AdminTranslationsPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <TranslationsEditor />
    </div>
  )
}
