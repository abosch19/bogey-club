/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as auth from "../auth.js";
import type * as courses from "../courses.js";
import type * as crons from "../crons.js";
import type * as helpers from "../helpers.js";
import type * as home from "../home.js";
import type * as http from "../http.js";
import type * as leagues from "../leagues.js";
import type * as migrate from "../migrate.js";
import type * as players from "../players.js";
import type * as profiles from "../profiles.js";
import type * as push from "../push.js";
import type * as pushNode from "../pushNode.js";
import type * as roundPlayers from "../roundPlayers.js";
import type * as rounds from "../rounds.js";
import type * as scores from "../scores.js";
import type * as stats from "../stats.js";
import type * as tournaments from "../tournaments.js";
import type * as whs from "../whs.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  auth: typeof auth;
  courses: typeof courses;
  crons: typeof crons;
  helpers: typeof helpers;
  home: typeof home;
  http: typeof http;
  leagues: typeof leagues;
  migrate: typeof migrate;
  players: typeof players;
  profiles: typeof profiles;
  push: typeof push;
  pushNode: typeof pushNode;
  roundPlayers: typeof roundPlayers;
  rounds: typeof rounds;
  scores: typeof scores;
  stats: typeof stats;
  tournaments: typeof tournaments;
  whs: typeof whs;
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
