//  @ts-check

import { tanstackConfig } from "@tanstack/eslint-config"
import convexPlugin from "@convex-dev/eslint-plugin"

export default [
  ...tanstackConfig,
  ...convexPlugin.configs.recommended,
  {
    rules: {
      "import/no-cycle": "off",
      "import/order": "off",
      "sort-imports": "off",
      "@typescript-eslint/array-type": "off",
      "@typescript-eslint/require-await": "off",
      "pnpm/json-enforce-catalog": "off",
    },
  },
  {
    ignores: [
      "eslint.config.js",
      ".prettierrc",
      "convex/_generated/**",
      ".output/**",
      "node_modules/**",
    ],
  },
]
