/**
 * Finding a place (design §9.2, `/places`): by postcode, by name, or by
 * browsing a pack's levels. The config is a parameter, so a test can hand in a
 * made-up country. Names, levels and parents are read for all hits at once.
 *
 * A name is found the way the map's box finds one: one slipped letter still
 * finds it. The database matches folded text; searchkit decides which names a
 * mistyped word could mean (from the names' own words) and ranks what came back.
 */
import {
  candidates,
  createVocabulary,
  rerank,
  tokenize,
  umlautSpelling,
  words,
  type Vocabulary,
} from "@bitbaum/searchkit";
import {
  and,
  count,
  eq,
  gt,
  inArray,
  isNull,
  like,
  lte,
  or,
  sql,
  type AnyColumn,
  type SQL,
} from "drizzle-orm";
import type { PlacesConfig } from "@/lib/config/places/schema";
import type { Database } from "@/lib/db/client";
import { jurisdictionNames, jurisdictionRelations, jurisdictions } from "@/lib/db/places-schema";
import type { ChainName } from "./chain";
import { FOLD_FROM, FOLD_TO, foldName } from "./fold";
import { displayName, localized } from "./place-view";
import { resolvePostcode, type PostcodeLocality } from "./postcodes";

/** `column`, folded in SQL exactly as `foldName` folds text. */
function foldedColumn(column: AnyColumn): SQL<string> {
  return sql<string>`replace(replace(replace(lower(translate(${column}, ${FOLD_FROM}, ${FOLD_TO})), 'ae', 'a'), 'oe', 'o'), 'ue', 'u')`;
}

export interface PlaceHit {
  slugPath: string;
  name: string;
  levelName: string;
  packName: string;
  /** The place's current parent, when it has one. */
  parentName: string | null;
  /** For a postcode search: the postcode's localities inside this place. */
  localities?: PostcodeLocality[];
}

export interface PlaceSearch {
  kind: "postcode" | "name";
  hits: PlaceHit[];
}

export interface LevelCount {
  key: string;
  name: string;
  count: number;
}

export interface PackIndex {
  key: string;
  name: string;
  levels: LevelCount[];
}

/** Name matches are capped: a search is for finding one place, not listing a country. */
export const NAME_SEARCH_LIMIT = 25;

/** Spellings tried per typed word besides the word itself. */
const CORRECTIONS_PER_WORD = 5;
/** How long the names' words are reused before they are read again; imports land at most daily. */
const VOCABULARY_TTL_MS = 10 * 60 * 1000;
const vocabularies = new WeakMap<Database, { key: string; at: number; vocab: Vocabulary }>();

const current = (on: string) =>
  and(
    or(isNull(jurisdictions.validFrom), lte(jurisdictions.validFrom, on)),
    or(isNull(jurisdictions.validTo), gt(jurisdictions.validTo, on)),
  );

/** `text` anywhere in a name, both folded alike; `%` and `_` typed are matched literally. */
const nameHolds = (text: string) =>
  like(
    foldedColumn(jurisdictionNames.name),
    `%${foldName(text).replace(/[\\%_]/g, (c) => `\\${c}`)}%`,
  );

/** The words of every current name of the configured packs, as searchkit compares them. */
async function nameVocabulary(db: Database, config: PlacesConfig, on: string): Promise<Vocabulary> {
  const packs = config.packs.map((p) => p.key);
  const key = `${on}|${packs.join(",")}`;
  const cached = vocabularies.get(db);
  if (cached && cached.key === key && Date.now() - cached.at < VOCABULARY_TTL_MS) {
    return cached.vocab;
  }
  const rows = await db
    .selectDistinct({ name: jurisdictionNames.name })
    .from(jurisdictionNames)
    .innerJoin(jurisdictions, eq(jurisdictions.id, jurisdictionNames.jurisdictionId))
    .where(
      and(
        isNull(jurisdictionNames.supersededAt),
        eq(jurisdictions.origin, "state"),
        inArray(jurisdictions.countryPack, packs),
        current(on),
      ),
    );
  // Each word also as typed without its umlaut ("zuerich"), as searchkit indexes it.
  const vocab = createVocabulary(
    rows.flatMap((r) =>
      tokenize(r.name).flatMap((t) => {
        const spelt = umlautSpelling(r.name.slice(t.start, t.end));
        return spelt ? [t.term, spelt] : [t.term];
      }),
    ),
  );
  vocabularies.set(db, { key, at: Date.now(), vocab });
  return vocab;
}

/**
 * Which names a query reaches: the text as typed anywhere in a name, or every
 * typed word the names know — as typed, or as a word of theirs it is one slip
 * from. A word no name comes near is set aside rather than failing the search.
 */
function nameMatches(query: string, vocab: Vocabulary): SQL | undefined {
  const perWord = [...new Set(words(query))].flatMap((typed) => {
    const found = candidates(vocab, typed, { limit: 100 });
    if (found.length === 0) {
      return [];
    }
    const typos = found.filter((c) => c.typos > 0).slice(0, CORRECTIONS_PER_WORD);
    return [or(nameHolds(typed), ...typos.map((c) => nameHolds(c.term)))!];
  });
  const whole = nameHolds(query);
  return perWord.length > 0 ? or(whole, and(...perWord)) : whole;
}

/** Hits for these places, in the order given; places of packs the config lacks are left out. */
async function placeHits(
  db: Database,
  config: PlacesConfig,
  ids: readonly string[],
  on: string,
  locale: string,
): Promise<Map<string, PlaceHit>> {
  const hits = new Map<string, PlaceHit>();
  if (ids.length === 0) {
    return hits;
  }
  const places = await db
    .select({
      id: jurisdictions.id,
      countryPack: jurisdictions.countryPack,
      levelKey: jurisdictions.levelKey,
      slugPath: jurisdictions.slugPath,
    })
    .from(jurisdictions)
    .where(and(inArray(jurisdictions.id, [...ids]), eq(jurisdictions.origin, "state")));
  const parents = await db
    .select({ childId: jurisdictionRelations.fromId, parentId: jurisdictionRelations.toId })
    .from(jurisdictionRelations)
    .where(
      and(
        inArray(jurisdictionRelations.fromId, [...ids]),
        eq(jurisdictionRelations.relation, "part_of"),
        isNull(jurisdictionRelations.supersededAt),
        or(isNull(jurisdictionRelations.validFrom), lte(jurisdictionRelations.validFrom, on)),
        or(isNull(jurisdictionRelations.validTo), gt(jurisdictionRelations.validTo, on)),
      ),
    );
  const parentOf = new Map(parents.map((r) => [r.childId, r.parentId]));
  const names = await db
    .select({
      jurisdictionId: jurisdictionNames.jurisdictionId,
      locale: jurisdictionNames.locale,
      script: jurisdictionNames.script,
      name: jurisdictionNames.name,
      nameType: jurisdictionNames.nameType,
    })
    .from(jurisdictionNames)
    .where(
      and(
        inArray(jurisdictionNames.jurisdictionId, [...ids, ...parentOf.values()]),
        isNull(jurisdictionNames.supersededAt),
        or(isNull(jurisdictionNames.validFrom), lte(jurisdictionNames.validFrom, on)),
        or(isNull(jurisdictionNames.validTo), gt(jurisdictionNames.validTo, on)),
      ),
    );
  const namesOf = (id: string): ChainName[] =>
    names.filter((n) => n.jurisdictionId === id).map(({ jurisdictionId: _, ...name }) => name);

  for (const place of places) {
    const pack = config.packs.find((p) => p.key === place.countryPack);
    if (!pack || !place.slugPath) {
      continue;
    }
    const level = pack.levels.find((l) => l.key === place.levelKey);
    const parentId = parentOf.get(place.id);
    hits.set(place.id, {
      slugPath: place.slugPath,
      name: displayName(namesOf(place.id), locale, pack.defaultLocales),
      levelName: level ? localized(level.names, locale) : (place.levelKey ?? ""),
      packName: localized(pack.names, locale),
      parentName: parentId
        ? displayName(namesOf(parentId), locale, pack.defaultLocales) || null
        : null,
    });
  }
  return new Map(ids.flatMap((id) => (hits.has(id) ? [[id, hits.get(id)!] as const] : [])));
}

/** A postcode of any pack that has postcodes, else a name. Empty for a blank query. */
export async function searchPlaces(
  db: Database,
  config: PlacesConfig,
  query: string,
  on: string,
  locale: string,
): Promise<PlaceSearch> {
  const q = query.trim();
  const postcodePacks = config.packs.filter(
    (p) => p.postcodePattern && new RegExp(`^(?:${p.postcodePattern})$`).test(q),
  );
  if (postcodePacks.length > 0) {
    const matches = (
      await Promise.all(postcodePacks.map((p) => resolvePostcode(db, p.key, q, on)))
    ).flat();
    const hits = await placeHits(
      db,
      config,
      matches.map((m) => m.jurisdictionId),
      on,
      locale,
    );
    return {
      kind: "postcode",
      hits: matches.flatMap((m) => {
        const hit = hits.get(m.jurisdictionId);
        return hit ? [{ ...hit, localities: m.localities }] : [];
      }),
    };
  }
  if (q.length < 2) {
    return { kind: "name", hits: [] };
  }
  const rows = await db
    .selectDistinct({ id: jurisdictionNames.jurisdictionId, name: jurisdictionNames.name })
    .from(jurisdictionNames)
    .innerJoin(jurisdictions, eq(jurisdictions.id, jurisdictionNames.jurisdictionId))
    .where(
      and(
        nameMatches(q, await nameVocabulary(db, config, on)),
        isNull(jurisdictionNames.supersededAt),
        eq(jurisdictions.origin, "state"),
        inArray(
          jurisdictions.countryPack,
          config.packs.map((p) => p.key),
        ),
        current(on),
      ),
    )
    .limit(NAME_SEARCH_LIMIT * 4);
  const matched = new Map<string, string[]>();
  for (const row of rows) {
    matched.set(row.id, [...(matched.get(row.id) ?? []), row.name]);
  }
  const hits = await placeHits(db, config, [...matched.keys()], on, locale);
  // Ranked by the name the reader sees before the one that matched (a
  // district's short name may be its town's); equals stay alphabetical.
  const found = [...hits]
    .map(([id, hit]) => ({ hit, names: matched.get(id) ?? [] }))
    .sort((a, b) => a.hit.name.localeCompare(b.hit.name, locale, { numeric: true }));
  const ranked = rerank(
    found,
    {
      fields: [
        { name: "name", get: (f) => f.hit.name },
        { name: "matched", get: (f) => f.names },
      ],
    },
    q,
  );
  return {
    kind: "name",
    hits: ranked.slice(0, NAME_SEARCH_LIMIT).map(({ item }) => item.hit),
  };
}

/** Every current place of one level of a pack, by name. */
export async function placesAtLevel(
  db: Database,
  config: PlacesConfig,
  packKey: string,
  levelKey: string,
  on: string,
  locale: string,
): Promise<PlaceHit[]> {
  const rows = await db
    .select({ id: jurisdictions.id })
    .from(jurisdictions)
    .where(
      and(
        eq(jurisdictions.countryPack, packKey),
        eq(jurisdictions.levelKey, levelKey),
        eq(jurisdictions.origin, "state"),
        current(on),
      ),
    );
  const hits = await placeHits(
    db,
    config,
    rows.map((r) => r.id),
    on,
    locale,
  );
  return [...hits.values()].sort((a, b) => a.name.localeCompare(b.name, locale, { numeric: true }));
}

/** Each pack with how many current places it holds at each of its levels. */
export async function loadPackIndex(
  db: Database,
  config: PlacesConfig,
  on: string,
  locale: string,
): Promise<PackIndex[]> {
  const counts = await db
    .select({
      pack: jurisdictions.countryPack,
      level: jurisdictions.levelKey,
      places: count(),
    })
    .from(jurisdictions)
    .where(and(eq(jurisdictions.origin, "state"), current(on)))
    .groupBy(jurisdictions.countryPack, jurisdictions.levelKey);
  return config.packs.map((pack) => ({
    key: pack.key,
    name: localized(pack.names, locale),
    levels: pack.levels.map((level) => ({
      key: level.key,
      name: localized(level.names, locale),
      count: Number(counts.find((c) => c.pack === pack.key && c.level === level.key)?.places ?? 0),
    })),
  }));
}
