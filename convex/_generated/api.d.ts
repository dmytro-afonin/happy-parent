/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as catalog from "../catalog.js";
import type * as comments from "../comments.js";
import type * as favorites from "../favorites.js";
import type * as lib_catalog from "../lib/catalog.js";
import type * as lib_copy from "../lib/copy.js";
import type * as lib_langs from "../lib/langs.js";
import type * as lib_placeDoc from "../lib/placeDoc.js";
import type * as migrations from "../migrations.js";
import type * as moderation from "../moderation.js";
import type * as photos from "../photos.js";
import type * as places from "../places.js";
import type * as seed from "../seed.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  catalog: typeof catalog;
  comments: typeof comments;
  favorites: typeof favorites;
  "lib/catalog": typeof lib_catalog;
  "lib/copy": typeof lib_copy;
  "lib/langs": typeof lib_langs;
  "lib/placeDoc": typeof lib_placeDoc;
  migrations: typeof migrations;
  moderation: typeof moderation;
  photos: typeof photos;
  places: typeof places;
  seed: typeof seed;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  migrations: import("@convex-dev/migrations/_generated/component.js").ComponentApi<"migrations">;
};
