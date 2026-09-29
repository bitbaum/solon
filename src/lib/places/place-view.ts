/**
 * What a place page shows, from the chain and config (design §9). Pure: the
 * loader reads the database, this decides what a reader sees, so a made-up
 * country renders from its pack alone.
 */
import type { LocalizedText, PlacesConfig } from "@/lib/config/places/schema";
import { taxingLevels } from "@/lib/tax-model";
import { evaluatorFacts, type ChainFact, type ChainName, type ChainPlace } from "./chain";

export interface PlaceLink {
  name: string;
  levelName: string;
  slugPath: string | null;
}

export interface PlaceIdentifier {
  label: string;
  value: string;
  url: string | null;
}

export interface PlaceSource {
  publisher: string;
  dataset: string;
  homepage: string;
  licence: string;
  attribution: string | null;
  retrievedAt: string;
}

export interface PlaceView {
  id: string;
  slugPath: string;
  name: string;
  levelName: string;
  packName: string;
  /** From the root down to the place's parent. */
  partOf: PlaceLink[];
  /** Places at overlapping levels that serve this one or a place above it. */
  alsoServedBy: PlaceLink[];
  otherNames: { locale: string; name: string }[];
  identifiers: PlaceIdentifier[];
  /** Null when the pack has no tax model yet. */
  takesTax: boolean | null;
  sources: PlaceSource[];
}

export interface PlaceViewInput {
  config: PlacesConfig;
  chain: readonly ChainPlace[];
  facts: readonly ChainFact[];
  identifiers: readonly { scheme: string; value: string }[];
  /** The latest retrieval of each source that stated something about the place. */
  sources: readonly { sourceKey: string; retrievedAt: Date }[];
  locale: string;
}

/** The text for a locale, else English, else whatever there is. */
export function localized(text: LocalizedText, locale: string): string {
  return text[locale] ?? text.en ?? Object.values(text)[0] ?? "";
}

/** A place's own name for a reader: in their language, else the pack's, else any. */
export function displayName(
  names: readonly ChainName[],
  locale: string,
  packLocales: readonly string[],
): string {
  const own = names.filter((n) => n.nameType === "self");
  const pool = own.length > 0 ? own : names;
  for (const wanted of [locale, ...packLocales]) {
    const match =
      pool.find((n) => n.locale === wanted && n.script === null) ??
      pool.find((n) => n.locale === wanted);
    if (match) {
      return match.name;
    }
  }
  return pool[0]?.name ?? "";
}

export function placeView(input: PlaceViewInput): PlaceView | null {
  const { config, chain, locale } = input;
  const place = chain.find((p) => p.depth === 0);
  const pack = config.packs.find((p) => p.key === place?.countryPack);
  if (!place || !pack || !place.slugPath) {
    return null;
  }
  const levelName = (levelKey: string | null) => {
    const level = pack.levels.find((l) => l.key === levelKey);
    return level ? localized(level.names, locale) : (levelKey ?? "");
  };
  const link = (p: ChainPlace): PlaceLink => ({
    name: displayName(p.names, locale, pack.defaultLocales),
    levelName: levelName(p.levelKey),
    slugPath: p.slugPath,
  });
  const name = displayName(place.names, locale, pack.defaultLocales);

  const schemes = new Map(config.identifierSchemes.map((s) => [s.key, s]));
  const identifiers = input.identifiers.map(({ scheme, value }) => {
    const entry = schemes.get(scheme);
    return {
      label: entry ? localized(entry.label, locale) : scheme,
      value,
      url: entry?.urlTemplate
        ? entry.urlTemplate.replace("{value}", encodeURIComponent(value))
        : null,
    };
  });

  const sources = input.sources.flatMap(({ sourceKey, retrievedAt }) => {
    const source = config.sources.find((s) => s.key === sourceKey);
    return source
      ? [
          {
            publisher: source.publisher,
            dataset: source.dataset,
            homepage: source.homepage,
            licence: source.licence,
            attribution: source.attribution ? localized(source.attribution, locale) : null,
            retrievedAt: retrievedAt.toISOString().slice(0, 10),
          },
        ]
      : [];
  });

  return {
    id: place.id,
    slugPath: place.slugPath,
    name,
    levelName: levelName(place.levelKey),
    packName: localized(pack.names, locale),
    partOf: chain
      .filter((p) => p.depth !== null && p.depth > 0)
      .sort((a, b) => b.depth! - a.depth!)
      .map(link),
    alsoServedBy: chain.filter((p) => p.depth === null).map(link),
    otherNames: place.names
      .filter((n) => n.name !== name)
      .map((n) => ({ locale: n.locale, name: n.name }))
      .filter(
        (n, i, all) => all.findIndex((m) => m.locale === n.locale && m.name === n.name) === i,
      ),
    identifiers,
    takesTax:
      pack.taxModel && place.levelKey
        ? taxingLevels(pack.taxModel, evaluatorFacts(chain, input.facts)).includes(place.levelKey)
        : null,
    sources,
  };
}
