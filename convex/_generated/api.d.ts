/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai from "../ai.js";
import type * as auth from "../auth.js";
import type * as brands from "../brands.js";
import type * as categories from "../categories.js";
import type * as chats from "../chats.js";
import type * as files from "../files.js";
import type * as http from "../http.js";
import type * as importData from "../importData.js";
import type * as products from "../products.js";
import type * as siteSettings from "../siteSettings.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  auth: typeof auth;
  brands: typeof brands;
  categories: typeof categories;
  chats: typeof chats;
  files: typeof files;
  http: typeof http;
  importData: typeof importData;
  products: typeof products;
  siteSettings: typeof siteSettings;
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
