import { internalMutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { emptyLangNames, withPlaceCopy } from "./lib/copy";

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

const SEED_PLACES: SeedPlace[] = [
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

/** Idempotent seed of catalog + public Warsaw demo places. CLI only. */
export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
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
    const knownNames = new Set(
      existingPlaces.flatMap((p) => {
        const names: string[] = [];
        if (p.name) names.push(p.name);
        if (p.copy) {
          for (const lang of Object.keys(p.copy) as Array<
            keyof typeof p.copy
          >) {
            const n = p.copy[lang].name.trim();
            if (n) names.push(n);
          }
        }
        return names;
      }),
    );

    let placesInserted = 0;
    for (const place of SEED_PLACES) {
      const copy = withPlaceCopy(place.copy);
      const displayName =
        copy.pl.name || copy.en.name || copy.uk.name || copy.ru.name;
      if (knownNames.has(displayName)) continue;

      const categoryIds = place.categories
        .map((slug) => slugToId.get(slug))
        .filter((id): id is Id<"catalogItems"> => Boolean(id));
      const attributeIds = place.attributes
        .map((slug) => slugToId.get(slug))
        .filter((id): id is Id<"catalogItems"> => Boolean(id));

      await ctx.db.insert("places", {
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
      placesInserted += 1;
    }

    return {
      catalogInserted,
      placesInserted,
      catalogTotal: SEED_CATALOG.length,
      placesTotal: SEED_PLACES.length,
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
