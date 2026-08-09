import { internalMutation } from "./_generated/server"
import type { MutationCtx } from "./_generated/server"
import { v } from "convex/values"

import type { Locale } from "./lib/locales"
import {
  LEGACY_CATEGORY_MAP,
  isLegacyPlaceCategoryId,
  isPlaceCategoryId,
} from "./lib/placeCategories"
import type { PlaceCategoryId } from "./lib/placeCategories"
import { userRoleValidator } from "./lib/roles"

type SeedTranslations = Record<Locale, string>

const CATEGORY_TRANSLATIONS: Record<PlaceCategoryId, SeedTranslations> = {
  food: {
    en: "Food",
    pl: "Jedzenie",
    uk: "Їжа",
    ru: "Еда",
    be: "Ежа",
  },
  utilities: {
    en: "Utilities",
    pl: "Udogodnienia",
    uk: "Зручності",
    ru: "Удобства",
    be: "Зручнасці",
  },
  entertainment: {
    en: "Entertainment",
    pl: "Rozrywka",
    uk: "Розваги",
    ru: "Развлечения",
    be: "Забавы",
  },
}

type SeedLabel = {
  slug: string
  category: PlaceCategoryId
  translations: SeedTranslations
}

/** Default labels focused on what is available in Warsaw. */
const SEED_LABELS: SeedLabel[] = [
  // Food
  {
    slug: "restaurant",
    category: "food",
    translations: {
      en: "Restaurant",
      pl: "Restauracja",
      uk: "Ресторан",
      ru: "Ресторан",
      be: "Рэстаран",
    },
  },
  {
    slug: "cafe",
    category: "food",
    translations: {
      en: "Café",
      pl: "Kawiarnia",
      uk: "Кав'ярня",
      ru: "Кафе",
      be: "Кавярня",
    },
  },
  {
    slug: "food-court",
    category: "food",
    translations: {
      en: "Food court",
      pl: "Strefa gastronomiczna",
      uk: "Фуд-корт",
      ru: "Фуд-корт",
      be: "Фуд-корт",
    },
  },
  {
    slug: "ice-cream",
    category: "food",
    translations: {
      en: "Ice cream",
      pl: "Lody",
      uk: "Морозиво",
      ru: "Мороженое",
      be: "Марожанае",
    },
  },
  {
    slug: "bakery",
    category: "food",
    translations: {
      en: "Bakery",
      pl: "Piekarnia",
      uk: "Пекарня",
      ru: "Пекарня",
      be: "Пякарня",
    },
  },
  // Utilities
  {
    slug: "toilet",
    category: "utilities",
    translations: {
      en: "Toilets",
      pl: "Toalety",
      uk: "Туалети",
      ru: "Туалеты",
      be: "Туалеты",
    },
  },
  {
    slug: "baby-changing",
    category: "utilities",
    translations: {
      en: "Baby changing room",
      pl: "Przewijak",
      uk: "Сповивальна кімната",
      ru: "Комната матери и ребёнка",
      be: "Пакой маці і дзіцяці",
    },
  },
  {
    slug: "clinic",
    category: "utilities",
    translations: {
      en: "Clinic",
      pl: "Przychodnia",
      uk: "Клініка",
      ru: "Клиника",
      be: "Клініка",
    },
  },
  {
    slug: "pharmacy",
    category: "utilities",
    translations: {
      en: "Pharmacy",
      pl: "Apteka",
      uk: "Аптека",
      ru: "Аптека",
      be: "Аптэка",
    },
  },
  // Entertainment
  {
    slug: "playground",
    category: "entertainment",
    translations: {
      en: "Playground",
      pl: "Plac zabaw",
      uk: "Дитячий майданчик",
      ru: "Детская площадка",
      be: "Дзіцячая пляцоўка",
    },
  },
  {
    slug: "park",
    category: "entertainment",
    translations: {
      en: "Park",
      pl: "Park",
      uk: "Парк",
      ru: "Парк",
      be: "Парк",
    },
  },
  {
    slug: "walking-zone",
    category: "entertainment",
    translations: {
      en: "Walking zone",
      pl: "Strefa spacerowa",
      uk: "Прогулянкова зона",
      ru: "Прогулочная зона",
      be: "Прагулачная зона",
    },
  },
  {
    slug: "kids-play-zone",
    category: "entertainment",
    translations: {
      en: "Kids play zone",
      pl: "Sala zabaw",
      uk: "Дитяча ігрова зона",
      ru: "Детская игровая зона",
      be: "Дзіцячая гульнявая зона",
    },
  },
  {
    slug: "museum",
    category: "entertainment",
    translations: {
      en: "Museum",
      pl: "Muzeum",
      uk: "Музей",
      ru: "Музей",
      be: "Музей",
    },
  },
  {
    slug: "library",
    category: "entertainment",
    translations: {
      en: "Library",
      pl: "Biblioteka",
      uk: "Бібліотека",
      ru: "Библиотека",
      be: "Бібліятэка",
    },
  },
  {
    slug: "pool",
    category: "entertainment",
    translations: {
      en: "Swimming pool",
      pl: "Basen",
      uk: "Басейн",
      ru: "Бассейн",
      be: "Басейн",
    },
  },
  {
    slug: "zoo",
    category: "entertainment",
    translations: {
      en: "Zoo",
      pl: "Zoo",
      uk: "Зоопарк",
      ru: "Зоопарк",
      be: "Заапарк",
    },
  },
]

async function upsertApprovedTranslation(
  ctx: MutationCtx,
  entityType: "category" | "label",
  entityKey: string,
  locale: Locale,
  value: string
) {
  const existing = await ctx.db
    .query("translations")
    .withIndex("by_entity", (q) =>
      q
        .eq("entityType", entityType)
        .eq("entityKey", entityKey)
        .eq("locale", locale)
    )
    .collect()

  if (existing.some((entry) => entry.status === "approved")) {
    return
  }

  await ctx.db.insert("translations", {
    entityType,
    entityKey,
    locale,
    value,
    status: "approved",
    createdAt: Date.now(),
  })
}

/**
 * Idempotent seed: default Warsaw-focused labels plus approved translations
 * for categories and labels in en/pl/uk/ru/be.
 *
 * Run with: npx convex run migrations:seedLabels
 */
export const seedLabels = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    for (const seed of SEED_LABELS) {
      const existing = await ctx.db
        .query("labels")
        .withIndex("by_slug", (q) => q.eq("slug", seed.slug))
        .unique()

      if (!existing) {
        await ctx.db.insert("labels", {
          slug: seed.slug,
          name: seed.translations.en,
          category: seed.category,
          createdAt: Date.now(),
        })
      }

      for (const [locale, value] of Object.entries(seed.translations)) {
        await upsertApprovedTranslation(
          ctx,
          "label",
          seed.slug,
          locale as Locale,
          value
        )
      }
    }

    for (const [category, translations] of Object.entries(
      CATEGORY_TRANSLATIONS
    )) {
      for (const [locale, value] of Object.entries(translations)) {
        await upsertApprovedTranslation(
          ctx,
          "category",
          category,
          locale as Locale,
          value
        )
      }
    }

    return null
  },
})

/**
 * Rewrites places that still use a legacy category id: assigns the new
 * generic category and attaches the equivalent label. Run seedLabels first.
 *
 * Run with: npx convex run migrations:migrateLegacyCategories
 */
export const migrateLegacyCategories = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const labels = await ctx.db.query("labels").collect()
    const labelBySlug = new Map(labels.map((label) => [label.slug, label._id]))

    const places = await ctx.db.query("places").collect()
    let migrated = 0

    for (const place of places) {
      if (isPlaceCategoryId(place.category)) {
        continue
      }

      if (!isLegacyPlaceCategoryId(place.category)) {
        throw new Error(
          `migrateLegacyCategories: no mapping for category "${String(place.category)}" on place ${String(place._id)}`
        )
      }

      const legacy = LEGACY_CATEGORY_MAP[place.category]
      const labelId = labelBySlug.get(legacy.labelSlug)
      if (!labelId) {
        throw new Error(
          `migrateLegacyCategories: missing label slug "${legacy.labelSlug}" — run seedLabels first`
        )
      }

      const labelIds = place.labelIds ?? []

      await ctx.db.patch("places", place._id, {
        category: legacy.category,
        labelIds: labelIds.includes(labelId)
          ? labelIds
          : [...labelIds, labelId],
      })
      migrated += 1
    }

    return migrated
  },
})

/**
 * Grants or revokes the admin role. Matches by email or Clerk user id
 * (tokenIdentifier suffix). There is no in-app promotion UI; run with:
 * npx convex run migrations:setUserRole '{"user":"you@example.com","role":"admin"}'
 */
export const setUserRole = internalMutation({
  args: {
    user: v.string(),
    role: userRoleValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const users = await ctx.db.query("users").collect()
    const user = users.find(
      (entry) =>
        entry.email === args.user ||
        entry.tokenIdentifier.endsWith(`|${args.user}`)
    )

    if (!user) {
      throw new Error(`No user found matching ${args.user}`)
    }

    await ctx.db.patch("users", user._id, { role: args.role })
    return null
  },
})
