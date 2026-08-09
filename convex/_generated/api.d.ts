/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as emails from "../emails.js";
import type * as favouritePlaces from "../favouritePlaces.js";
import type * as geocoding from "../geocoding.js";
import type * as imagekit from "../imagekit.js";
import type * as labels from "../labels.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_geometry from "../lib/geometry.js";
import type * as lib_locales from "../lib/locales.js";
import type * as lib_mapPreferenceFields from "../lib/mapPreferenceFields.js";
import type * as lib_mapStyles from "../lib/mapStyles.js";
import type * as lib_moderation from "../lib/moderation.js";
import type * as lib_moderationNotify from "../lib/moderationNotify.js";
import type * as lib_nominatim from "../lib/nominatim.js";
import type * as lib_placeCategories from "../lib/placeCategories.js";
import type * as lib_places from "../lib/places.js";
import type * as lib_roles from "../lib/roles.js";
import type * as lib_users from "../lib/users.js";
import type * as mapPreferences from "../mapPreferences.js";
import type * as migrations from "../migrations.js";
import type * as moderation from "../moderation.js";
import type * as placeComments from "../placeComments.js";
import type * as placePhotos from "../placePhotos.js";
import type * as places from "../places.js";
import type * as recentCategories from "../recentCategories.js";
import type * as recentSearches from "../recentSearches.js";
import type * as savedPlaces from "../savedPlaces.js";
import type * as translations from "../translations.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  emails: typeof emails;
  favouritePlaces: typeof favouritePlaces;
  geocoding: typeof geocoding;
  imagekit: typeof imagekit;
  labels: typeof labels;
  "lib/auth": typeof lib_auth;
  "lib/geometry": typeof lib_geometry;
  "lib/locales": typeof lib_locales;
  "lib/mapPreferenceFields": typeof lib_mapPreferenceFields;
  "lib/mapStyles": typeof lib_mapStyles;
  "lib/moderation": typeof lib_moderation;
  "lib/moderationNotify": typeof lib_moderationNotify;
  "lib/nominatim": typeof lib_nominatim;
  "lib/placeCategories": typeof lib_placeCategories;
  "lib/places": typeof lib_places;
  "lib/roles": typeof lib_roles;
  "lib/users": typeof lib_users;
  mapPreferences: typeof mapPreferences;
  migrations: typeof migrations;
  moderation: typeof moderation;
  placeComments: typeof placeComments;
  placePhotos: typeof placePhotos;
  places: typeof places;
  recentCategories: typeof recentCategories;
  recentSearches: typeof recentSearches;
  savedPlaces: typeof savedPlaces;
  translations: typeof translations;
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

export declare const components: {};
