import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/translations")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/translations" })
  },
  component: () => null,
})
