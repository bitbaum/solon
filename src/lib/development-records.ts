/**
 * Solon's public development records — the roadmap and the changelog.
 *
 * The record itself lives in this repository (`ROADMAP.md`, `CHANGELOG.md`);
 * Loki's fleet map ingests it, and the site reads the map back. The repo is
 * the source, the map is the producer, this page is a consumer — so there is
 * no local copy of either list for the page to drift from.
 */
import { developmentProfileFromMap, loadDevelopmentProfile } from "bip-kit";

export const FLEET_MAP_URL = "https://loki.orangecat.ch/api/fleet/map";
export const FLEET_SLUG = "solon";
export const FLEET_PROFILE_URL = `https://loki.orangecat.ch/fleet/${FLEET_SLUG}`;

/** The map is cached five minutes on the producer; ask for it no more often. */
export const MAP_REVALIDATE_SECONDS = 300;
/** A map that takes longer than this is treated as unavailable, not awaited. */
export const MAP_TIMEOUT_MS = 8_000;

/**
 * Next's fetch options for the map. `loadDevelopmentProfile` passes
 * `cache: "no-store"`, which Next refuses alongside `revalidate`; the fetcher
 * below replaces the cache mode with the revalidation window instead.
 */
export function mapRequestInit(init?: RequestInit): RequestInit & { next: { revalidate: number } } {
  const rest: RequestInit = { ...init };
  delete rest.cache;
  return {
    ...rest,
    next: { revalidate: MAP_REVALIDATE_SECONDS },
    signal: AbortSignal.timeout(MAP_TIMEOUT_MS),
  };
}

export const mapFetcher: typeof fetch = (input, init) => fetch(input, mapRequestInit(init));

/** Solon's profile from the live map, or null when the map is unreachable. */
export function loadSolonProfile() {
  return loadDevelopmentProfile(FLEET_MAP_URL, FLEET_SLUG, mapFetcher);
}

/** The same projection the page renders, from an already-fetched map. */
export function solonProfileFromMap(map: unknown) {
  return developmentProfileFromMap(map, FLEET_SLUG);
}
