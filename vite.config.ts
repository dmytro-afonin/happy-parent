import { defineConfig } from "vite"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { nitro } from "nitro/vite"
import { aliasClerkEnv } from "./src/lib/clerk-env.ts"

aliasClerkEnv()

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  // Marketplace Clerk syncs NEXT_PUBLIC_*; TanStack/Vite apps also use VITE_*.
  envPrefix: ["VITE_", "NEXT_PUBLIC_"],
  plugins: [devtools(), tailwindcss(), tanstackStart(), nitro(), viteReact()],
})

export default config
