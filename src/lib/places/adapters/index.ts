import { fixtureAdapter } from "./fixture";
import type { Adapter } from "./types";

/** Every adapter, by the key sources name in the registry. */
export const ADAPTERS: ReadonlyMap<string, Adapter> = new Map(
  [fixtureAdapter as Adapter].map((adapter) => [adapter.key, adapter]),
);

export type { Adapter } from "./types";
