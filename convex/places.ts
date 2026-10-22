import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  isPlaceAttribute,
  isPlaceType,
  PLACE_ATTRIBUTES,
  PLACE_TYPES,
} from "./lib/catalog";
import { requireAdmin, requireUser } from "./users";

/** Public map payload: place fields only (no photos, no comments). */
export const listApproved = query({
  args: {},
  handler: async (ctx) => {
    const places = await ctx.db
      .query("places")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .collect();

    return places.map((place) => ({
      _id: place._id,
      name: place.name,
      description: place.description,
      address: place.address,
      lat: place.lat,
      lng: place.lng,
      geometryType: place.geometryType,
      boundary: place.boundary,
      type: place.type,
      attributes: place.attributes,
      status: place.status,
    }));
  },
});

const MAX_NAME_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 2_000;
const MAX_ADDRESS_LENGTH = 300;

function assertPlaceFields(input: {
  name: string;
  description?: string;
  address?: string;
  lat: number;
  lng: number;
  attributes: string[];
}): void {
  if (!input.name) {
    throw new Error("Name is required");
  }
  if (input.name.length > MAX_NAME_LENGTH) {
    throw new Error("Name is too long");
  }
  if (
    input.description &&
    input.description.length > MAX_DESCRIPTION_LENGTH
  ) {
    throw new Error("Description is too long");
  }
  if (input.address && input.address.length > MAX_ADDRESS_LENGTH) {
    throw new Error("Address is too long");
  }
  if (!Number.isFinite(input.lat) || input.lat < -90 || input.lat > 90) {
    throw new Error("Latitude is out of range");
  }
  if (!Number.isFinite(input.lng) || input.lng < -180 || input.lng > 180) {
    throw new Error("Longitude is out of range");
  }
  if (input.attributes.length > PLACE_ATTRIBUTES.length) {
    throw new Error("Too many attributes");
  }
}

function assertCatalog(
  type: string,
  attributes: string[],
): void {
  if (!isPlaceType(type)) {
    throw new Error(`Unknown place type: ${type}`);
  }
  for (const attr of attributes) {
    if (!isPlaceAttribute(attr)) {
      throw new Error(`Unknown attribute: ${attr}`);
    }
  }
}

/** Signed-in user creates a point place as approved. */
export const createPoint = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    address: v.optional(v.string()),
    lat: v.number(),
    lng: v.number(),
    type: v.string(),
    attributes: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    const name = args.name.trim();
    const description = args.description?.trim() || undefined;
    const address = args.address?.trim() || undefined;
    assertPlaceFields({
      name,
      description,
      address,
      lat: args.lat,
      lng: args.lng,
      attributes: args.attributes,
    });
    assertCatalog(args.type, args.attributes);

    const now = Date.now();
    return await ctx.db.insert("places", {
      name,
      description,
      address,
      lat: args.lat,
      lng: args.lng,
      geometryType: "point",
      type: args.type,
      attributes: args.attributes,
      status: "approved",
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/** Admin saves a polygon place (boundary + centroid). */
export const createPolygon = mutation({
  args: {
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
    type: v.string(),
    attributes: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { userId } = await requireUser(ctx);
    assertCatalog(args.type, args.attributes);

    if (args.boundary.length < 3) {
      throw new Error("Polygon needs at least 3 vertices");
    }

    const name = args.name.trim();
    const description = args.description?.trim() || undefined;
    const address = args.address?.trim() || undefined;
    assertPlaceFields({
      name,
      description,
      address,
      lat: args.lat,
      lng: args.lng,
      attributes: args.attributes,
    });

    const now = Date.now();
    return await ctx.db.insert("places", {
      name,
      description,
      address,
      lat: args.lat,
      lng: args.lng,
      geometryType: "polygon",
      boundary: args.boundary,
      type: args.type,
      attributes: args.attributes,
      status: "approved",
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/** Dev helper: catalog constants for clients that import via Convex. */
export const catalog = query({
  args: {},
  handler: async () => {
    return {
      types: PLACE_TYPES,
      attributes: PLACE_ATTRIBUTES,
    };
  },
});
