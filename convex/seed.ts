import { internalMutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

const SEED_TOKEN = "seed|happy-parent";

const SEED_PLACES = [
  {
    name: "Saxon Garden Playground",
    description: "Central playground near the palace gardens.",
    address: "Ogród Saski, Warszawa",
    lat: 52.2405,
    lng: 21.0092,
    geometryType: "point" as const,
    type: "playground",
    attributes: ["free", "stroller", "shade", "3-6", "7-12"],
  },
  {
    name: "Łazienki Park",
    description: "Wide paths and lawns for family walks.",
    address: "Łazienki Królewskie, Warszawa",
    lat: 52.214,
    lng: 21.035,
    geometryType: "point" as const,
    type: "park",
    attributes: ["free", "stroller", "shade", "0-2", "3-6", "7-12"],
  },
  {
    name: "Cafe Zoska",
    description: "Family-friendly cafe with high chairs.",
    address: "ul. Freta 12, Warszawa",
    lat: 52.2508,
    lng: 21.0125,
    geometryType: "point" as const,
    type: "cafe",
    attributes: ["indoor", "stroller", "toilet", "0-2", "3-6"],
  },
  {
    name: "POLIN Museum",
    description: "Museum of the History of Polish Jews.",
    address: "ul. Anielewicza 6, Warszawa",
    lat: 52.2495,
    lng: 20.993,
    geometryType: "point" as const,
    type: "museum",
    attributes: ["indoor", "stroller", "toilet", "7-12", "13+"],
  },
  {
    name: "Public Library — Praga",
    description: "Quiet reading room and kids corner.",
    address: "ul. Jagiellońska 28, Warszawa",
    lat: 52.2512,
    lng: 21.0355,
    geometryType: "point" as const,
    type: "library",
    attributes: ["indoor", "free", "stroller", "toilet", "3-6", "7-12"],
  },
  {
    name: "Indoor Play Arena",
    description: "Soft play and climbing for rainy days.",
    address: "ul. Puławska 66, Warszawa",
    lat: 52.2055,
    lng: 21.023,
    geometryType: "point" as const,
    type: "indoor-play",
    attributes: ["indoor", "toilet", "0-2", "3-6", "7-12"],
  },
  {
    name: "Mokotów Pool",
    description: "Public pool with family hours.",
    address: "ul. Różana 5, Warszawa",
    lat: 52.198,
    lng: 21.018,
    geometryType: "point" as const,
    type: "pool",
    attributes: ["indoor", "toilet", "3-6", "7-12", "13+"],
  },
  {
    name: "Family Clinic Centrum",
    description: "Pediatric clinic near the metro.",
    address: "ul. Marszałkowska 100, Warszawa",
    lat: 52.225,
    lng: 21.012,
    geometryType: "point" as const,
    type: "clinic",
    attributes: ["indoor", "stroller", "toilet", "0-2", "3-6"],
  },
  {
    name: "Vistula Park Strip",
    description: "Sample park area as a polygon boundary.",
    address: "Bulwary Wiślane, Warszawa",
    lat: 52.247,
    lng: 21.0285,
    geometryType: "polygon" as const,
    boundary: [
      { lat: 52.2482, lng: 21.027 },
      { lat: 52.2482, lng: 21.03 },
      { lat: 52.2458, lng: 21.03 },
      { lat: 52.2458, lng: 21.027 },
      { lat: 52.2482, lng: 21.027 },
    ],
    type: "park",
    attributes: ["free", "stroller", "shade", "3-6", "7-12"],
  },
];

/** Idempotent seed of approved Warsaw demo places. CLI only. */
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

    const existing = await ctx.db.query("places").collect();
    const names = new Set(existing.map((p) => p.name));
    let inserted = 0;
    const now = Date.now();

    for (const place of SEED_PLACES) {
      if (names.has(place.name)) continue;
      await ctx.db.insert("places", {
        name: place.name,
        description: place.description,
        address: place.address,
        lat: place.lat,
        lng: place.lng,
        geometryType: place.geometryType,
        boundary: "boundary" in place ? place.boundary : undefined,
        type: place.type,
        attributes: place.attributes,
        status: "approved",
        createdBy: seedUserId,
        createdAt: now,
        updatedAt: now,
      });
      inserted += 1;
    }

    return { inserted, totalSeedNames: SEED_PLACES.length };
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
