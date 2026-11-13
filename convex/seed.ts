import { internalMutation, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { emptyLangNames, withPlaceCopy } from "./lib/copy";
import { assertDemoSeedAllowed } from "./lib/seedGuard";
import { WARSAW_OSM_PLACES } from "./lib/warsawSeedPlaces";

const SEED_TOKEN = "seed|happy-parent";

type SeedCatalog = {
  kind: "category" | "attribute";
  slug: string;
  names: Record<"pl" | "en" | "uk" | "ru" | "be", string>;
};

const SEED_CATALOG: SeedCatalog[] = [
  {
    kind: "category",
    slug: "park",
    names: { ru: "Парк", pl: "Park", en: "Park", uk: "Парк", be: "Парк" },
  },
  {
    kind: "category",
    slug: "playground",
    names: {
      ru: "Детская площадка",
      pl: "Plac zabaw",
      en: "Playground",
      uk: "Дитячий майданчик",
      be: "Дзіцячая пляцоўка",
    },
  },
  {
    kind: "category",
    slug: "cafe",
    names: {
      ru: "Кафе",
      pl: "Kawiarnia",
      en: "Cafe",
      uk: "Кафе",
      be: "Кавярня",
    },
  },
  {
    kind: "category",
    slug: "library",
    names: {
      ru: "Библиотека",
      pl: "Biblioteka",
      en: "Library",
      uk: "Бібліотека",
      be: "Бібліятэка",
    },
  },
  {
    kind: "category",
    slug: "pool",
    names: {
      ru: "Бассейн",
      pl: "Basen",
      en: "Pool",
      uk: "Басейн",
      be: "Басейн",
    },
  },
  {
    kind: "category",
    slug: "museum",
    names: {
      ru: "Музей",
      pl: "Muzeum",
      en: "Museum",
      uk: "Музей",
      be: "Музей",
    },
  },
  {
    kind: "category",
    slug: "restaurant",
    names: {
      ru: "Ресторан",
      pl: "Restauracja",
      en: "Restaurant",
      uk: "Ресторан",
      be: "Рэстаран",
    },
  },
  {
    kind: "category",
    slug: "indoor-play",
    names: {
      ru: "Игровая комната",
      pl: "Sala zabaw",
      en: "Indoor play",
      uk: "Ігрова кімната",
      be: "Гульнявая пакой",
    },
  },
  {
    kind: "category",
    slug: "clinic",
    names: {
      ru: "Клиника",
      pl: "Przychodnia",
      en: "Clinic",
      uk: "Клініка",
      be: "Клініка",
    },
  },
  {
    kind: "attribute",
    slug: "free",
    names: {
      ru: "Бесплатно",
      pl: "Bezpłatne",
      en: "Free",
      uk: "Безкоштовно",
      be: "Бясплатна",
    },
  },
  {
    kind: "attribute",
    slug: "shade",
    names: {
      ru: "Тень",
      pl: "Cień",
      en: "Shade",
      uk: "Тінь",
      be: "Цень",
    },
  },
  {
    kind: "attribute",
    slug: "toilet",
    names: {
      ru: "Туалет",
      pl: "Toaleta",
      en: "Toilet",
      uk: "Туалет",
      be: "Туалет",
    },
  },
  {
    kind: "attribute",
    slug: "stroller",
    names: {
      ru: "Коляска",
      pl: "Wózek",
      en: "Stroller",
      uk: "Візок",
      be: "Каляска",
    },
  },
  {
    kind: "attribute",
    slug: "indoor",
    names: {
      ru: "В помещении",
      pl: "Wewnątrz",
      en: "Indoor",
      uk: "У приміщенні",
      be: "У памяшканні",
    },
  },
  {
    kind: "attribute",
    slug: "0-2",
    names: {
      ru: "0–2",
      pl: "0–2",
      en: "Ages 0–2",
      uk: "0–2",
      be: "0–2",
    },
  },
  {
    kind: "attribute",
    slug: "3-6",
    names: {
      ru: "3–6",
      pl: "3–6",
      en: "Ages 3–6",
      uk: "3–6",
      be: "3–6",
    },
  },
  {
    kind: "attribute",
    slug: "7-12",
    names: {
      ru: "7–12",
      pl: "7–12",
      en: "Ages 7–12",
      uk: "7–12",
      be: "7–12",
    },
  },
  {
    kind: "attribute",
    slug: "13+",
    names: {
      ru: "13+",
      pl: "13+",
      en: "Ages 13+",
      uk: "13+",
      be: "13+",
    },
  },
];

type SeedPlace = {
  key: string;
  categories: string[];
  attributes: string[];
  lat: number;
  lng: number;
  geometryType: "point" | "polygon";
  boundary?: Array<{ lat: number; lng: number }>;
  copy: Parameters<typeof withPlaceCopy>[0];
};

const HAND_PLACES: SeedPlace[] = [
  {
    key: "pole-mokotowskie",
    categories: ["park", "playground"],
    attributes: ["free", "shade", "toilet", "3-6", "7-12"],
    lat: 52.2105,
    lng: 21.007,
    geometryType: "point",
    copy: {
      pl: {
        name: "Pole Mokotowskie",
        description: "Duży park z placami zabaw, alejkami i stawem.",
        address: "ul. Rokitnicka, Warszawa",
      },
      en: {
        name: "Pole Mokotowskie",
        description: "Large park with playgrounds, paths, and a pond.",
        address: "ul. Rokitnicka, Warsaw",
      },
      ru: {
        name: "Поле Мокотовске",
        description: "Большой парк с площадками, дорожками и прудом.",
        address: "ул. Рокитницка, Варшава",
      },
      uk: {
        name: "Поле Мокотовське",
        description: "Великий парк з майданчиками, доріжками та ставком.",
        address: "вул. Рокітницька, Варшава",
      },
      be: {
        name: "Поле Макатоўскае",
        description: "Вялікі парк з пляцоўкамі, дарожкамі і сажалкай.",
        address: "вул. Ракітніцка, Варшава",
      },
    },
  },
  {
    key: "cafe-lula",
    categories: ["cafe"],
    attributes: ["stroller", "indoor", "0-2"],
    lat: 52.2265,
    lng: 21.0128,
    geometryType: "point",
    copy: {
      pl: {
        name: "Cafe Lula",
        description: "Mała kawiarnia z przewijakiem i miejscem na wózek.",
        address: "ul. Hoża, Warszawa",
      },
      en: {
        name: "Cafe Lula",
        description: "Small cafe with a changing table and room for a stroller.",
        address: "ul. Hoża, Warsaw",
      },
    },
  },
  {
    key: "library-koszykowa",
    categories: ["library"],
    attributes: ["free", "toilet", "indoor", "3-6", "7-12"],
    lat: 52.2228,
    lng: 21.0115,
    geometryType: "point",
    copy: {
      pl: {
        name: "Biblioteka na Koszykowej",
        description: "Biblioteka publiczna z salą dla dzieci.",
        address: "ul. Koszykowa 26, Warszawa",
      },
      en: {
        name: "Library na Koszykowej",
        description: "Public library with a children's room.",
        address: "ul. Koszykowa 26, Warsaw",
      },
      uk: {
        name: "Бібліотека на Кошиковій",
        description: "Публічна бібліотека з дитячою залою.",
        address: "вул. Кошикова 26, Варшава",
      },
    },
  },
  {
    key: "lazienki",
    categories: ["park"],
    attributes: ["free", "shade", "stroller", "0-2", "3-6", "7-12"],
    lat: 52.214,
    lng: 21.035,
    geometryType: "point",
    copy: {
      pl: {
        name: "Łazienki Królewskie",
        description: "Park królewski z pawilonami i stawem.",
        address: "ul. Agrykola, Warszawa",
      },
      en: {
        name: "Łazienki Królewskie",
        description: "Royal park with pavilions and a pond.",
        address: "ul. Agrykola, Warsaw",
      },
    },
  },
  {
    key: "saxon-playground",
    categories: ["playground"],
    attributes: ["free", "stroller", "shade", "3-6", "7-12"],
    lat: 52.2405,
    lng: 21.0092,
    geometryType: "point",
    copy: {
      en: {
        name: "Saxon Garden Playground",
        description: "Central playground near the palace gardens.",
        address: "Ogród Saski, Warszawa",
      },
      pl: {
        name: "Plac zabaw w Ogrodzie Saskim",
        description: "Centralny plac zabaw przy ogrodach pałacowych.",
        address: "Ogród Saski, Warszawa",
      },
    },
  },
  {
    key: "vistula-strip",
    categories: ["park"],
    attributes: ["free", "stroller", "shade", "3-6", "7-12"],
    lat: 52.247,
    lng: 21.0285,
    geometryType: "polygon",
    boundary: [
      { lat: 52.2482, lng: 21.027 },
      { lat: 52.2482, lng: 21.03 },
      { lat: 52.2458, lng: 21.03 },
      { lat: 52.2458, lng: 21.027 },
      { lat: 52.2482, lng: 21.027 },
    ],
    copy: {
      en: {
        name: "Vistula Park Strip",
        description: "Sample park area as a polygon boundary.",
        address: "Bulwary Wiślane, Warszawa",
      },
      pl: {
        name: "Bulwary Wiślane",
        description: "Przykładowy obszar parku jako poligon.",
        address: "Bulwary Wiślane, Warszawa",
      },
    },
  },
];

const SEED_PLACES: SeedPlace[] = [...HAND_PLACES, ...WARSAW_OSM_PLACES];

/** Favourites for the seed user only. Recents are browser localStorage. */
const SEED_FAVORITE_KEYS = [
  "pole-mokotowskie",
  "saxon-playground",
  "cafe-lula",
  "library-koszykowa",
];

/** Idempotent seed of catalog + public Warsaw demo places. CLI only. */
async function insertDemoSeed(ctx: MutationCtx) {
  assertDemoSeedAllowed(process.env.CONVEX_CLOUD_URL);

  const seedUser = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", SEED_TOKEN))
    .unique();

  const seedUserId: Id<"users"> = seedUser
    ? seedUser._id
    : await ctx.db.insert("users", {
        tokenIdentifier: SEED_TOKEN,
        name: "Seed",
        email: "seed@happyparent.local",
        role: "admin",
      });

  const now = Date.now();
  const slugToId = new Map<string, Id<"catalogItems">>();
  let catalogInserted = 0;

  for (const row of SEED_CATALOG) {
    const existing = await ctx.db
      .query("catalogItems")
      .withIndex("by_slug", (q) => q.eq("slug", row.slug))
      .unique();
    if (existing) {
      slugToId.set(row.slug, existing._id);
      continue;
    }
    const names = emptyLangNames();
    Object.assign(names, row.names);
    const id = await ctx.db.insert("catalogItems", {
      kind: row.kind,
      slug: row.slug,
      names,
      createdAt: now,
      updatedAt: now,
    });
    slugToId.set(row.slug, id);
    catalogInserted += 1;
  }

  const existingPlaces = await ctx.db.query("places").collect();
  const knownNames = new Set<string>();
  const idByName = new Map<string, Id<"places">>();
  for (const existing of existingPlaces) {
    const names: string[] = [];
    if (existing.name) names.push(existing.name);
    if (existing.copy) {
      for (const lang of Object.keys(existing.copy) as Array<
        keyof typeof existing.copy
      >) {
        const n = existing.copy[lang].name.trim();
        if (n) names.push(n);
      }
    }
    for (const n of names) {
      knownNames.add(n);
      idByName.set(n, existing._id);
    }
  }

  let placesInserted = 0;
  for (const place of SEED_PLACES) {
    const copy = withPlaceCopy(place.copy);
    const seedNames = [
      copy.pl.name,
      copy.en.name,
      copy.uk.name,
      copy.ru.name,
      copy.be.name,
    ]
      .map((n) => n.trim())
      .filter(Boolean);
    // Match any locale (incl. legacy English titles) so re-seed after migrate
    // does not duplicate places that still have English-only names.
    if (seedNames.some((n) => knownNames.has(n))) continue;

    const categoryIds = place.categories
      .map((slug) => slugToId.get(slug))
      .filter((id): id is Id<"catalogItems"> => Boolean(id));
    const attributeIds = place.attributes
      .map((slug) => slugToId.get(slug))
      .filter((id): id is Id<"catalogItems"> => Boolean(id));

    const placeId = await ctx.db.insert("places", {
      copy,
      categoryIds,
      attributeIds,
      publishStatus: "public",
      lat: place.lat,
      lng: place.lng,
      geometryType: place.geometryType,
      boundary: place.boundary,
      createdBy: seedUserId,
      createdAt: now,
      updatedAt: now,
    });
    for (const n of seedNames) {
      knownNames.add(n);
      idByName.set(n, placeId);
    }
    placesInserted += 1;
  }

  let favoritesInserted = 0;
  for (const key of SEED_FAVORITE_KEYS) {
    const favorite = SEED_PLACES.find((place) => place.key === key);
    if (!favorite) continue;
    const copy = withPlaceCopy(favorite.copy);
    const placeId = idByName.get(copy.pl.name.trim());
    if (!placeId) continue;
    const existingFavorite = await ctx.db
      .query("favorites")
      .withIndex("by_user_place", (q) =>
        q.eq("userId", seedUserId).eq("placeId", placeId),
      )
      .unique();
    if (existingFavorite) continue;
    await ctx.db.insert("favorites", {
      userId: seedUserId,
      placeId,
      createdAt: now,
    });
    favoritesInserted += 1;
  }

  return {
    catalogInserted,
    placesInserted,
    favoritesInserted,
    catalogTotal: SEED_CATALOG.length,
    placesTotal: SEED_PLACES.length,
  };
}

export const run = internalMutation({
  args: {},
  handler: async (ctx) => insertDemoSeed(ctx),
});

/**
 * Delete places created by the seed user, plus favourites, comments, photos,
 * and moderation rows on those places. Does not delete the catalog, the seed
 * user, or anyone else's places. Insert-only `seed:run` never calls this.
 * Refuses production. CLI or dashboard only.
 */
export const clearDemo = internalMutation({
  args: {},
  handler: async (ctx) => {
    assertDemoSeedAllowed(process.env.CONVEX_CLOUD_URL);

    const seedUser = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", SEED_TOKEN))
      .unique();
    if (!seedUser) {
      return {
        placesDeleted: 0,
        favoritesDeleted: 0,
        commentsDeleted: 0,
        photosDeleted: 0,
        moderationDeleted: 0,
      };
    }

    const seedPlaces = (await ctx.db.query("places").collect()).filter(
      (place) => place.createdBy === seedUser._id,
    );
    const placeIds = new Set(seedPlaces.map((place) => place._id));

    let favoritesDeleted = 0;
    for (const favorite of await ctx.db.query("favorites").collect()) {
      if (favorite.userId === seedUser._id || placeIds.has(favorite.placeId)) {
        await ctx.db.delete(favorite._id);
        favoritesDeleted += 1;
      }
    }

    let commentsDeleted = 0;
    let photosDeleted = 0;
    let moderationDeleted = 0;
    for (const placeId of placeIds) {
      const comments = await ctx.db
        .query("comments")
        .withIndex("by_place_status", (q) => q.eq("placeId", placeId))
        .collect();
      for (const comment of comments) {
        await ctx.db.delete(comment._id);
        commentsDeleted += 1;
      }

      const photos = await ctx.db
        .query("photos")
        .withIndex("by_place_status", (q) => q.eq("placeId", placeId))
        .collect();
      for (const photo of photos) {
        await ctx.storage.delete(photo.storageId);
        await ctx.db.delete(photo._id);
        photosDeleted += 1;
      }

      const queue = await ctx.db
        .query("moderationQueue")
        .withIndex("by_place", (q) => q.eq("placeId", placeId))
        .collect();
      for (const item of queue) {
        await ctx.db.delete(item._id);
        moderationDeleted += 1;
      }

      await ctx.db.delete(placeId);
    }

    return {
      placesDeleted: seedPlaces.length,
      favoritesDeleted,
      commentsDeleted,
      photosDeleted,
      moderationDeleted,
    };
  },
});

/** Promote the current signed-in user to admin. CLI only. */
export const promoteMeAdmin = internalMutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Sign in required");
    }
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
    if (!user) {
      throw new Error("Call users.ensure first");
    }
    await ctx.db.patch(user._id, { role: "admin" });
    return { role: "admin" as const };
  },
});

/**
 * Promote existing users matching ADMIN_CLERK_USER_IDS only.
 * CLI only — no auth / no email matching (cannot verify email_verified offline).
 */
export const promoteAdminsFromEnv = internalMutation({
  args: {},
  handler: async (ctx) => {
    const ids = new Set(
      (process.env.ADMIN_CLERK_USER_IDS ?? "")
        .split(/[,;\s]+/)
        .map((e) => e.trim())
        .filter(Boolean),
    );

    const users = await ctx.db.query("users").collect();
    let promoted = 0;
    const skipped: string[] = [];

    for (const user of users) {
      if (user.role === "admin") continue;
      if (user.tokenIdentifier.startsWith("seed|")) continue;

      let idOk = false;
      for (const id of ids) {
        if (
          user.tokenIdentifier === id ||
          user.tokenIdentifier.endsWith(`|${id}`)
        ) {
          idOk = true;
          break;
        }
      }

      if (idOk) {
        await ctx.db.patch(user._id, { role: "admin" });
        promoted += 1;
      } else {
        skipped.push(user.tokenIdentifier.slice(-24));
      }
    }

    return {
      promoted,
      idsConfigured: ids.size,
      skippedSuffixes: skipped,
    };
  },
});
