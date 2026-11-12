import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import {
  clonePlaceCopy,
  emptyPlaceCopy,
  placeCopyValidator,
  readLangName,
} from "./lib/copy";
import { isLang, LANG_LABELS, type Lang } from "./lib/langs";
import { normalizePlace, placeDisplay } from "./lib/placeDoc";
import { requireAdmin, requireUser } from "./users";

const MAX_NAME = 120;
const MAX_DESCRIPTION = 2_000;
const MAX_ADDRESS = 300;

const pointValidator = v.object({
  lat: v.number(),
  lng: v.number(),
});

function assertCoords(lat: number, lng: number) {
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    throw new Error("Latitude is out of range");
  }
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    throw new Error("Longitude is out of range");
  }
}

function assertCopyLengths(copy: {
  name: string;
  description: string;
  address: string;
}) {
  if (copy.name.length > MAX_NAME) throw new Error("Name is too long");
  if (copy.description.length > MAX_DESCRIPTION) {
    throw new Error("Description is too long");
  }
  if (copy.address.length > MAX_ADDRESS) throw new Error("Address is too long");
}

async function assertCatalogIds(
  ctx: { db: { get: (id: Id<"catalogItems">) => Promise<{ kind: string } | null> } },
  categoryIds: Id<"catalogItems">[],
  attributeIds: Id<"catalogItems">[],
) {
  for (const id of categoryIds) {
    const item = await ctx.db.get(id);
    if (!item || item.kind !== "category") {
      throw new Error("Unknown category");
    }
  }
  for (const id of attributeIds) {
    const item = await ctx.db.get(id);
    if (!item || item.kind !== "attribute") {
      throw new Error("Unknown attribute");
    }
  }
}

async function catalogLabels(
  ctx: {
    db: {
      get: (
        id: Id<"catalogItems">,
      ) => Promise<{ names: Record<Lang, string> } | null>;
    };
  },
  ids: Id<"catalogItems">[],
) {
  const labels: string[] = [];
  for (const id of ids) {
    const item = await ctx.db.get(id);
    if (item) labels.push(readLangName(item.names));
  }
  return labels;
}

/** Public map: all public places (client filters / sorts). */
export const listPublic = query({
  args: {},
  handler: async (ctx) => {
    const docs = await ctx.db.query("places").collect();
    const publicPlaces = docs
      .map(normalizePlace)
      .filter((p) => p.publishStatus === "public");

    const out = [];
    for (const place of publicPlaces) {
      const display = placeDisplay(place);
      const categoryLabels = await catalogLabels(ctx, place.categoryIds);
      const attributeLabels = await catalogLabels(ctx, place.attributeIds);
      const photoRows = await ctx.db
        .query("photos")
        .withIndex("by_place_status", (q) =>
          q.eq("placeId", place._id).eq("status", "approved"),
        )
        .collect();
      out.push({
        _id: place._id,
        name: display.name,
        description: display.description,
        address: display.address,
        copy: place.copy,
        categoryIds: place.categoryIds,
        attributeIds: place.attributeIds,
        categories: categoryLabels,
        attributes: attributeLabels,
        lat: place.lat,
        lng: place.lng,
        geometryType: place.geometryType,
        boundary: place.boundary,
        photos: photoRows.length,
        updatedAt: place.updatedAt,
      });
    }
    return out;
  },
});

/** Admin list: every place + pending queue summary. */
export const listAdmin = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const me = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
    if (!me || me.role !== "admin") return null;

    const docs = await ctx.db.query("places").collect();
    const queue = await ctx.db.query("moderationQueue").collect();
    const catalog = await ctx.db.query("catalogItems").collect();
    const labelById = new Map(
      catalog.map((item) => [item._id, readLangName(item.names)] as const),
    );

    const users = await ctx.db.query("users").collect();
    const nameByUser = new Map(
      users.map((u) => [u._id, u.name ?? "Parent"] as const),
    );

    const places = [];
    for (const doc of docs) {
      const place = normalizePlace(doc);
      const display = placeDisplay(place);
      const waiting = queue.filter((item) => item.placeId === place._id);
      const waitingWithPhotos = [];
      for (const item of waiting) {
        let photoUrl: string | null = null;
        if (item.photoId) {
          const photo = await ctx.db.get(item.photoId);
          if (photo) {
            photoUrl = await ctx.storage.getUrl(photo.storageId);
          }
        }
        waitingWithPhotos.push({
          _id: item._id,
          kind: item.kind,
          detail: item.detail,
          body: item.body,
          language: item.language,
          who: nameByUser.get(item.submittedBy) ?? "Parent",
          photoId: item.photoId,
          photoUrl,
          commentId: item.commentId,
          field: item.field,
          createdAt: item.createdAt,
        });
      }
      places.push({
        _id: place._id,
        copy: place.copy,
        name: display.name,
        description: display.description,
        address: display.address,
        categoryIds: place.categoryIds,
        attributeIds: place.attributeIds,
        categories: place.categoryIds
          .map((id) => labelById.get(id) ?? "")
          .filter(Boolean),
        attributes: place.attributeIds
          .map((id) => labelById.get(id) ?? "")
          .filter(Boolean),
        publishStatus: place.publishStatus,
        lat: place.lat,
        lng: place.lng,
        geometryType: place.geometryType,
        boundary: place.boundary,
        filledLangs: display.filledLangs,
        updatedAt: place.updatedAt,
        queue: waitingWithPhotos,
      });
    }

    return { places, queueCount: queue.length };
  },
});

export const getAdmin = query({
  args: { placeId: v.id("places") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const me = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
    if (!me || me.role !== "admin") return null;

    const doc = await ctx.db.get(args.placeId);
    if (!doc) return null;
    const place = normalizePlace(doc);
    const photos = await ctx.db
      .query("photos")
      .withIndex("by_place_status", (q) =>
        q.eq("placeId", args.placeId).eq("status", "approved"),
      )
      .collect();
    const pendingPhotos = await ctx.db
      .query("photos")
      .withIndex("by_place_status", (q) =>
        q.eq("placeId", args.placeId).eq("status", "pending"),
      )
      .collect();

    const photoRows = [];
    for (const row of [...photos, ...pendingPhotos]) {
      photoRows.push({
        _id: row._id,
        status: row.status,
        url: await ctx.storage.getUrl(row.storageId),
        createdAt: row.createdAt,
      });
    }

    return {
      ...place,
      name: placeDisplay(place).name,
      photos: photoRows,
    };
  },
});

/** Signed-in user proposes a new point place → draft + queue. */
export const submitPoint = mutation({
  args: {
    language: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    address: v.optional(v.string()),
    lat: v.number(),
    lng: v.number(),
    categoryIds: v.array(v.id("catalogItems")),
    attributeIds: v.array(v.id("catalogItems")),
  },
  handler: async (ctx, args) => {
    const { user, userId } = await requireUser(ctx);
    if (!isLang(args.language)) throw new Error("Unknown language");
    assertCoords(args.lat, args.lng);
    await assertCatalogIds(ctx, args.categoryIds, args.attributeIds);

    const name = args.name.trim();
    if (!name) throw new Error("Name is required");
    const description = args.description?.trim() ?? "";
    const address = args.address?.trim() ?? "";
    assertCopyLengths({ name, description, address });

    const copy = emptyPlaceCopy();
    copy[args.language] = { name, description, address };

    const now = Date.now();
    const placeId = await ctx.db.insert("places", {
      copy,
      categoryIds: args.categoryIds,
      attributeIds: args.attributeIds,
      publishStatus: "draft",
      lat: args.lat,
      lng: args.lng,
      geometryType: "point",
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("moderationQueue", {
      kind: "place",
      placeId,
      submittedBy: userId,
      language: args.language,
      detail: `${LANG_LABELS[args.language]} place`,
      body: description || name,
      createdAt: now,
    });

    return { placeId, who: user.name ?? "You" };
  },
});

/** Signed-in user proposes an area (polygon) → draft + queue. */
export const submitPolygon = mutation({
  args: {
    language: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    address: v.optional(v.string()),
    lat: v.number(),
    lng: v.number(),
    boundary: v.array(
      v.object({
        lat: v.number(),
        lng: v.number(),
      }),
    ),
    categoryIds: v.array(v.id("catalogItems")),
    attributeIds: v.array(v.id("catalogItems")),
  },
  handler: async (ctx, args) => {
    const { user, userId } = await requireUser(ctx);
    if (!isLang(args.language)) throw new Error("Unknown language");
    assertCoords(args.lat, args.lng);
    await assertCatalogIds(ctx, args.categoryIds, args.attributeIds);
    if (args.boundary.length < 3) {
      throw new Error("Polygon needs at least 3 vertices");
    }

    const name = args.name.trim();
    if (!name) throw new Error("Name is required");
    const description = args.description?.trim() ?? "";
    const address = args.address?.trim() ?? "";
    assertCopyLengths({ name, description, address });

    const copy = emptyPlaceCopy();
    copy[args.language] = { name, description, address };

    const now = Date.now();
    const placeId = await ctx.db.insert("places", {
      copy,
      categoryIds: args.categoryIds,
      attributeIds: args.attributeIds,
      publishStatus: "draft",
      lat: args.lat,
      lng: args.lng,
      geometryType: "polygon",
      boundary: args.boundary,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("moderationQueue", {
      kind: "place",
      placeId,
      submittedBy: userId,
      language: args.language,
      detail: `${LANG_LABELS[args.language]} area`,
      body: description || name,
      createdAt: now,
    });

    return { placeId, who: user.name ?? "You" };
  },
});

/** Suggest an edit or translation on a public place. */
export const suggestCopyChange = mutation({
  args: {
    placeId: v.id("places"),
    language: v.string(),
    field: v.union(
      v.literal("name"),
      v.literal("description"),
      v.literal("address"),
    ),
    body: v.string(),
    kind: v.union(v.literal("edit"), v.literal("translation")),
  },
  handler: async (ctx, args) => {
    const { user, userId } = await requireUser(ctx);
    if (!isLang(args.language)) throw new Error("Unknown language");
    const body = args.body.trim();
    if (!body) throw new Error("Suggestion is empty");
    assertCopyLengths({
      name: args.field === "name" ? body : "",
      description: args.field === "description" ? body : "",
      address: args.field === "address" ? body : "",
    });

    const placeDoc = await ctx.db.get(args.placeId);
    if (!placeDoc) throw new Error("Place not found");
    const place = normalizePlace(placeDoc);
    if (place.publishStatus !== "public") {
      throw new Error("Place is not public yet");
    }

    const now = Date.now();
    await ctx.db.insert("moderationQueue", {
      kind: args.kind,
      placeId: args.placeId,
      submittedBy: userId,
      language: args.language,
      field: args.field,
      detail: `${LANG_LABELS[args.language]} ${args.field}`,
      body,
      createdAt: now,
    });

    return { who: user.name ?? "You" };
  },
});

/** Admin create / update place (direct, no queue). */
export const adminSave = mutation({
  args: {
    id: v.optional(v.id("places")),
    copy: placeCopyValidator,
    categoryIds: v.array(v.id("catalogItems")),
    attributeIds: v.array(v.id("catalogItems")),
    publishStatus: v.union(v.literal("public"), v.literal("draft")),
    lat: v.number(),
    lng: v.number(),
    geometryType: v.union(v.literal("point"), v.literal("polygon")),
    boundary: v.optional(v.array(pointValidator)),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    assertCoords(args.lat, args.lng);
    await assertCatalogIds(ctx, args.categoryIds, args.attributeIds);

    const copy = clonePlaceCopy(args.copy);
    for (const lang of Object.keys(copy) as Lang[]) {
      copy[lang] = {
        name: copy[lang].name.trim(),
        description: copy[lang].description.trim(),
        address: copy[lang].address.trim(),
      };
      assertCopyLengths(copy[lang]);
    }
    if (!Object.values(copy).some((c) => c.name)) {
      throw new Error("Name is required in at least one language");
    }

    if (args.geometryType === "polygon") {
      if (!args.boundary || args.boundary.length < 3) {
        throw new Error("Polygon needs at least 3 vertices");
      }
    }

    const now = Date.now();
    if (args.id) {
      const existing = await ctx.db.get(args.id);
      if (!existing) throw new Error("Place not found");
      await ctx.db.patch(args.id, {
        copy,
        categoryIds: args.categoryIds,
        attributeIds: args.attributeIds,
        publishStatus: args.publishStatus,
        lat: args.lat,
        lng: args.lng,
        geometryType: args.geometryType,
        boundary: args.geometryType === "polygon" ? args.boundary : undefined,
        updatedAt: now,
      });
      return args.id;
    }

    return await ctx.db.insert("places", {
      copy,
      categoryIds: args.categoryIds,
      attributeIds: args.attributeIds,
      publishStatus: args.publishStatus,
      lat: args.lat,
      lng: args.lng,
      geometryType: args.geometryType,
      boundary: args.geometryType === "polygon" ? args.boundary : undefined,
      createdBy: admin._id,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/** Admin polygon create (direct public). Legacy type/attributes map via slug. */
export const createPolygon = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    address: v.optional(v.string()),
    lat: v.number(),
    lng: v.number(),
    boundary: v.array(pointValidator),
    type: v.string(),
    attributes: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    assertCoords(args.lat, args.lng);
    if (args.boundary.length < 3) {
      throw new Error("Polygon needs at least 3 vertices");
    }
    const name = args.name.trim();
    if (!name) throw new Error("Name is required");

    const catalog = await ctx.db.query("catalogItems").collect();
    const category = catalog.find(
      (item) => item.kind === "category" && item.slug === args.type,
    );
    const attributeIds = catalog
      .filter(
        (item) =>
          item.kind === "attribute" && args.attributes.includes(item.slug),
      )
      .map((item) => item._id);

    const copy = emptyPlaceCopy();
    copy.en = {
      name,
      description: args.description?.trim() ?? "",
      address: args.address?.trim() ?? "",
    };
    const now = Date.now();
    return await ctx.db.insert("places", {
      copy,
      categoryIds: category ? [category._id] : [],
      attributeIds,
      publishStatus: "public",
      lat: args.lat,
      lng: args.lng,
      geometryType: "polygon",
      boundary: args.boundary,
      createdBy: admin._id,
      createdAt: now,
      updatedAt: now,
    });
  },
});
