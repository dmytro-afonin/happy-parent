import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/preferences")({
  component: PreferencesPage,
})

function PreferencesPage() {
  return (
    <main className="container mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">User preferences</h1>
      <p className="mt-2 text-muted-foreground">
        App preferences will live here.
      </p>
    </main>
  )
}
