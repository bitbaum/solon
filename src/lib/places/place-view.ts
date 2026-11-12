/**
 * What a place page shows, from the chain and config (design §9). Pure: the
 * loader reads the database, this decides what a reader sees, so a made-up
 * country renders from its pack alone.
 */
import {
  findSource,
  type LocalizedText,
  type PlacesConfig,
  type Source,
} from "@/lib/config/places/schema";
import { configTranslation } from "@/lib/i18n/config-catalog";
import { taxingLevels } from "@/lib/tax-model";
import {
  evaluatorFacts,
  standsForLevels,
  type ChainFact,
  type ChainInstrument,
  type ChainName,
  type ChainPlace,
} from "./chain";

export interface PlaceLink {
  name: string;
  levelName: string;
  slugPath: string | null;
  /** The path its page has; what its link is built from. */
  canonicalPath: string | null;
  /** Its identifiers as `scheme:value`, for a place inside this one (its photograph, its tile). */
  refs?: string[];
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

/** Something a resident can do, at the authority that offers it. */
export interface PlaceAction {
  kind: string;
  /** What following the link does, in the reader's language. */
  label: string;
  url: string;
  /** The place whose authority offers it: the canton, for a commune. */
  offeredBy: PlaceLink;
  /** The usual last day each year (`MM-DD`) and the page that states it. */
  deadline: { monthDay: string; source: string } | null;
}

/** The places directly inside one, at one level. */
export interface PlaceParts {
  levelName: string;
  places: PlaceLink[];
}

export interface PlaceView {
  id: string;
  slugPath: string;
  name: string;
  levelName: string;
  packName: string;
  packKey: string;
  /** The pack's ISO 3166-1 region, when it is a country. */
  region: string | null;
  /** The places directly inside it, by level in the pack's order, each by name. */
  parts: PlaceParts[];
  /** From the root down to the place's parent. */
  partOf: PlaceLink[];
  /** Places at overlapping levels that serve this one or a place above it. */
  alsoServedBy: PlaceLink[];
  otherNames: { locale: string; name: string }[];
  identifiers: PlaceIdentifier[];
  /** Its identifiers as stored, `scheme:value`: how its photograph and other records are found. */
  refs: string[];
  /** Null when the pack has no tax model yet. */
  takesTax: boolean | null;
  /** What a resident can do here, one per kind, in the registry's order. */
  actions: PlaceAction[];
  /** Places inside it whose figures refine its own (localities with rates of their own). */
  refinedBy: PlaceLink[];
  /** The law register's authorities whose law applies here; set by the page loader. */
  lawAuthorities?: string[];
  sources: PlaceSource[];
}

export interface PlaceViewInput {
  config: PlacesConfig;
  chain: readonly ChainPlace[];
  facts: readonly ChainFact[];
  identifiers: readonly { scheme: string; value: string }[];
  instruments: readonly ChainInstrument[];
  /** Places directly inside it whose level stands for its own. */
  refinements?: readonly ChainPlace[];
  /** Every place directly inside it. */
  parts?: readonly ChainPlace[];
  /** The identifiers of the places inside it. */
  partIdentifiers?: readonly { jurisdictionId: string; scheme: string; value: string }[];
  /** The latest retrieval of each source that stated something about the place. */
  sources: readonly { sourceKey: string; retrievedAt: Date }[];
  locale: string;
}

/** The text for a locale, else English, else whatever there is. */
/**
 * A configured text in the reader's language: the configuration's own words
 * for that language, else the catalog's translation of the English
 * (`data/i18n/config.json`), else the English.
 */
export function localized(text: LocalizedText, locale: string): string {
  return (
    text[locale] ??
    (text.en === undefined ? undefined : configTranslation(text.en, locale)) ??
    text.en ??
    Object.values(text)[0] ??
    ""
  );
}

/**
 * A place's name for a reader, so a page reads in one language: its own name
 * in the reader's language; else the name the reader's language uses for it
 * (Tskhinval for an English reader, never город Цхинвал); else its own name
 * in the pack's languages; else any. A historical name is never shown as the
 * current one. Its own names stay listed on its page with their languages.
 */
export function displayName(
  names: readonly ChainName[],
  locale: string,
  packLocales: readonly string[],
): string {
  const current = names.filter((n) => n.nameType !== "historical");
  const own = current.filter((n) => n.nameType === "self");
  const inLocale = (pool: readonly ChainName[], wanted: string) =>
    pool.find((n) => n.locale === wanted && n.script === null) ??
    pool.find((n) => n.locale === wanted);
  const found =
    inLocale(own, locale) ??
    inLocale(current, locale) ??
    packLocales.map((l) => inLocale(own, l)).find(Boolean) ??
    own[0] ??
    current[0] ??
    names[0];
  return found?.name ?? "";
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
    canonicalPath: p.canonicalPath,
  });
  const name = displayName(place.names, locale, pack.defaultLocales);
  const partRefs = new Map<string, string[]>();
  for (const { jurisdictionId, scheme, value } of input.partIdentifiers ?? []) {
    partRefs.set(jurisdictionId, [...(partRefs.get(jurisdictionId) ?? []), `${scheme}:${value}`]);
  }

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

  return {
    id: place.id,
    slugPath: place.slugPath,
    name,
    levelName: levelName(place.levelKey),
    packName: localized(pack.names, locale),
    packKey: pack.key,
    region: pack.region ?? null,
    parts: pack.levels.flatMap((level) => {
      const places = (input.parts ?? [])
        .filter((p) => p.levelKey === level.key)
        .map((p) => ({ ...link(p), refs: partRefs.get(p.id) ?? [] }))
        .sort((a, b) => a.name.localeCompare(b.name, locale));
      return places.length > 0 ? [{ levelName: localized(level.names, locale), places }] : [];
    }),
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
    refs: input.identifiers.map(({ scheme, value }) => `${scheme}:${value}`),
    takesTax:
      pack.taxModel && place.levelKey
        ? taxingLevels(
            pack.taxModel,
            evaluatorFacts(chain, input.facts, standsForLevels(pack.levels)),
          ).includes(place.levelKey)
        : null,
    actions: placeActions(config, input.chain, input.instruments, locale),
    refinedBy: (input.refinements ?? []).map(link),
    sources: placeSources(config, input.sources, locale),
  };
}

/**
 * For each instrument kind, the one offered nearest the place: its own, else
 * its parent's, up the chain; places beside the chain come last. Pure.
 */
export function placeActions(
  config: PlacesConfig,
  chain: readonly ChainPlace[],
  instruments: readonly ChainInstrument[],
  locale: string,
): PlaceAction[] {
  const place = chain.find((p) => p.depth === 0);
  const pack = config.packs.find((p) => p.key === place?.countryPack);
  if (!pack) {
    return [];
  }
  const rank = (p: ChainPlace) => p.depth ?? Number.MAX_SAFE_INTEGER;
  const byId = new Map(chain.map((p) => [p.id, p]));
  return config.instrumentKinds.flatMap((kind) => {
    const offered = instruments
      .filter((i) => i.kind === kind.key && i.officialUrl !== null && byId.has(i.jurisdictionId))
      .sort((a, b) => rank(byId.get(a.jurisdictionId)!) - rank(byId.get(b.jurisdictionId)!));
    const nearest = offered[0];
    if (kind.retired || !nearest) {
      return [];
    }
    const by = byId.get(nearest.jurisdictionId)!;
    const level = pack.levels.find((l) => l.key === by.levelKey);
    const { deadline, deadlineSource } = nearest.requirements;
    return [
      {
        kind: kind.key,
        label: localized(kind.label, locale),
        url: nearest.officialUrl!,
        offeredBy: {
          name: displayName(by.names, locale, pack.defaultLocales),
          levelName: level ? localized(level.names, locale) : "",
          slugPath: by.slugPath,
          canonicalPath: by.canonicalPath,
        },
        deadline:
          deadline && deadlineSource ? { monthDay: deadline, source: deadlineSource } : null,
      },
    ];
  });
}

/**
 * The registered sources behind these retrievals, in the reader's language: one entry a source,
 * dated by its latest retrieval, however many keys its figures were read under (an unchanged
 * figure keeps the key it was first read under).
 */
export function placeSources(
  config: PlacesConfig,
  retrievals: readonly { sourceKey: string; retrievedAt: Date }[],
  locale: string,
): PlaceSource[] {
  const latest = new Map<string, { source: Source; retrievedAt: Date }>();
  for (const { sourceKey, retrievedAt } of retrievals) {
    const source = findSource(config, sourceKey);
    const seen = source ? latest.get(source.key) : undefined;
    if (source && (!seen || retrievedAt > seen.retrievedAt)) {
      latest.set(source.key, { source, retrievedAt });
    }
  }
  return [...latest.values()].map(({ source, retrievedAt }) => ({
    publisher: source.publisher,
    dataset: source.dataset,
    homepage: source.homepage,
    licence: source.licence,
    attribution: source.attribution ? localized(source.attribution, locale) : null,
    retrievedAt: retrievedAt.toISOString().slice(0, 10),
  }));
}
