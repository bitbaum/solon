/**
 * A country with a pack can be named by a world-list slug that is not its
 * pack's root (`/places/czechia` for a pack `czech_republic`): that answers 308
 * to the pack's canonical root, at every depth below it. The underscored pack
 * key (`united_states`) is not handled here: it is a path the place once had,
 * and `place_paths` answers 308 to the hyphenated one (`findPlace`).
 *
 * Pure, so a test can hand in made-up packs; `proxy.ts` applies it before a
 * page is rendered, so it needs no database and no page. Design:
 * docs/design/2026-11-place-navigation.md, QA item 6.
 */
import { locales } from "@/i18n/routing";

export interface SlugRedirect {
  /** The first segment under /places that names the country, other than its canonical root. */
  from: string;
  /** The pack's canonical root path (hyphenated), where its places are. */
  to: string;
}

/** A pack's key as its root path is written: `place_paths`' canonical form. */
export const hyphenated = (key: string) => key.replace(/_/g, "-");

/** Every world-list slug that names a pack, other than the pack's canonical (hyphenated) root. */
export function worldSlugRedirects(
  packs: readonly { key: string; region?: string | undefined }[],
  world: readonly { code?: string | undefined; slug: string }[],
): SlugRedirect[] {
  const out = new Map<string, string>();
  for (const pack of packs) {
    const names = new Set<string>();
    for (const entry of world) {
      if (pack.region && entry.code === pack.region) names.add(entry.slug);
    }
    for (const from of names) {
      if (from !== hyphenated(pack.key)) out.set(from, hyphenated(pack.key));
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
