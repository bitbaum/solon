/**
 * A country with a pack has two names for its page: the world list's slug
 * (`/places/united-states`) and the pack's own root (`/places/united_states`).
 * Two addresses for one place, answering with contradicting pages (the world
 * page saying Solon holds no places there, the pack showing five units): the
 * world slug answers 308 to the pack's path, at every depth below it
 * (`/places/united-states/wyoming` is `/places/united_states/wyoming`).
 *
 * Pure, so a test can hand in made-up packs; `proxy.ts` applies it before a
 * page is rendered, so it needs no database and no page. Design:
 * docs/design/2026-11-place-navigation.md, QA item 6. `place_paths` later makes
 * the hyphenated form the canonical one; this stands until then.
 */
import { locales } from "@/i18n/routing";

export interface SlugRedirect {
  /** The first segment under /places that names the country. */
  from: string;
  /** The pack's root path, where its places are. */
  to: string;
}

const hyphenated = (key: string) => key.replace(/_/g, "-");

/** Every world-list slug (or hyphenated pack key) that names a pack, other than the pack's own key. */
export function worldSlugRedirects(
  packs: readonly { key: string; region?: string | undefined }[],
  world: readonly { code?: string | undefined; slug: string }[],
): SlugRedirect[] {
  const out = new Map<string, string>();
  for (const pack of packs) {
    const names = new Set<string>([hyphenated(pack.key)]);
    for (const entry of world) {
      if (pack.region && entry.code === pack.region) names.add(entry.slug);
    }
    for (const from of names) {
      if (from !== pack.key) out.set(from, pack.key);
    }
  }
  return [...out].map(([from, to]) => ({ from, to }));
}

const PLACES = /^(?:\/(?<locale>[a-z]{2}))?\/places\/(?<first>[^/]+)(?<rest>(?:\/.*)?)$/;

/** The path to answer 308 with, or null when the path is not under a world slug that has a pack. */
export function redirectWorldSlug(
  pathname: string,
  redirects: readonly SlugRedirect[],
): string | null {
  const match = PLACES.exec(pathname)?.groups;
  if (!match) return null;
  const locale = match.locale;
  if (locale && !(locales as readonly string[]).includes(locale)) return null;
  let first: string;
  try {
    first = decodeURIComponent(match.first!);
  } catch {
    return null;
  }
  const hit = redirects.find((r) => r.from === first);
  if (!hit) return null;
  return `${locale ? `/${locale}` : ""}/places/${hit.to}${match.rest ?? ""}`;
}
