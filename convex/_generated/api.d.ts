/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as analytics from "../analytics.js";
import type * as analyticsModel from "../analyticsModel.js";
import type * as auth from "../auth.js";
import type * as authz from "../authz.js";
import type * as blogCategories from "../blogCategories.js";
import type * as blogs from "../blogs.js";
import type * as brands from "../brands.js";
import type * as categories from "../categories.js";
import type * as chats from "../chats.js";
import type * as crons from "../crons.js";
import type * as faultCodes from "../faultCodes.js";
import type * as http from "../http.js";
import type * as imageStorage from "../imageStorage.js";
import type * as oem from "../oem.js";
import type * as products from "../products.js";
import type * as services from "../services.js";
import type * as settings from "../settings.js";
import type * as slug from "../slug.js";
import type * as storage from "../storage.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  analytics: typeof analytics;
  analyticsModel: typeof analyticsModel;
  auth: typeof auth;
  authz: typeof authz;
  blogCategories: typeof blogCategories;
  blogs: typeof blogs;
  brands: typeof brands;
  categories: typeof categories;
  chats: typeof chats;
  crons: typeof crons;
  faultCodes: typeof faultCodes;
  http: typeof http;
  imageStorage: typeof imageStorage;
  oem: typeof oem;
  products: typeof products;
  services: typeof services;
  settings: typeof settings;
  slug: typeof slug;
  storage: typeof storage;
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
