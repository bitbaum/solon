/**
 * The database side of a place page: a state place by its path, its chain, the
 * facts the chain holds, its identifiers and the sources behind all of it, on
 * a given day. The config is a parameter, so a test can hand in a made-up
 * country.
 */
import { and, eq, inArray, isNull, or, sql } from "drizzle-orm";
import type { PlacesConfig } from "@/lib/config/places/schema";
import type { Database } from "@/lib/db/client";
import {
  jurisdictionIdentifiers,
  jurisdictionNames,
  jurisdictionRelations,
  jurisdictions,
  sources,
} from "@/lib/db/places-schema";
import { loadChain, loadFacts, loadInstruments, loadRefinements } from "./chain";
import { lawAuthoritiesFor } from "@/lib/law/ask/scope";
import { placeView, type PlaceView } from "./place-view";

export async function loadPlacePage(
  db: Database,
  config: PlacesConfig,
  slugPath: string,
  on: string,
  locale: string,
): Promise<PlaceView | null> {
  const [place] = await db
    .select({ id: jurisdictions.id, countryPack: jurisdictions.countryPack })
    .from(jurisdictions)
    .where(and(eq(jurisdictions.slugPath, slugPath), eq(jurisdictions.origin, "state")));
  if (!place || !config.packs.some((p) => p.key === place.countryPack)) {
    return null;
  }

  const chain = await loadChain(db, place.id, on);
  const facts = await loadFacts(
    db,
    chain.map((p) => p.id),
    on,
  );
  const instruments = await loadInstruments(
    db,
    chain.map((p) => p.id),
    on,
  );
  const refinements = await loadRefinements(
    db,
    [place.id],
    config.packs.flatMap((p) => p.levels.flatMap((l) => (l.standsFor ? [l.key] : []))),
    on,
  );
  const identifiers = await db
    .select({
      scheme: jurisdictionIdentifiers.scheme,
      value: jurisdictionIdentifiers.value,
      sourceId: jurisdictionIdentifiers.sourceId,
    })
    .from(jurisdictionIdentifiers)
    .where(
      and(
        eq(jurisdictionIdentifiers.jurisdictionId, place.id),
        isNull(jurisdictionIdentifiers.supersededAt),
      ),
    );

  const names = await db
    .select({ sourceId: jurisdictionNames.sourceId })
    .from(jurisdictionNames)
    .where(
      and(eq(jurisdictionNames.jurisdictionId, place.id), isNull(jurisdictionNames.supersededAt)),
    );
  const relations = await db
    .select({ sourceId: jurisdictionRelations.sourceId })
    .from(jurisdictionRelations)
    .where(
      and(
        or(eq(jurisdictionRelations.fromId, place.id), eq(jurisdictionRelations.toId, place.id)),
        isNull(jurisdictionRelations.supersededAt),
      ),
    );
  const retrievals = await loadRetrievals(db, [
    ...identifiers.map((r) => r.sourceId),
    ...names.map((r) => r.sourceId),
    ...relations.map((r) => r.sourceId),
    ...facts.filter((f) => f.jurisdictionId === place.id).map((f) => f.sourceId),
    ...instruments.map((i) => i.sourceId),
  ]);

  // Whose law applies here: the place's own authority and those above it.
  const chainIdentifiers = await db
    .select({ scheme: jurisdictionIdentifiers.scheme, value: jurisdictionIdentifiers.value })
    .from(jurisdictionIdentifiers)
    .where(
      and(
        inArray(
          jurisdictionIdentifiers.jurisdictionId,
          chain.map((p) => p.id),
        ),
        isNull(jurisdictionIdentifiers.supersededAt),
      ),
    );

  const view = placeView({
    config,
    chain,
    facts,
    identifiers,
    instruments,
    refinements: refinements.map((r) => r.place),
    sources: retrievals,
    locale,
  });
  return view && { ...view, lawAuthorities: lawAuthoritiesFor(chainIdentifiers) };
}

/** The latest retrieval of each source among these `sources` rows. */
export async function loadRetrievals(
  db: Database,
  sourceIds: readonly (string | null)[],
): Promise<{ sourceKey: string; retrievedAt: Date }[]> {
  const ids = [...new Set(sourceIds.filter((id): id is string => id !== null))];
  if (ids.length === 0) {
    return [];
  }
  const rows = await db
    .select({
      sourceKey: sources.sourceKey,
      retrievedAt: sql<Date>`max(${sources.retrievedAt})`,
    })
    .from(sources)
    .where(inArray(sources.id, ids))
    .groupBy(sources.sourceKey);
  return rows.map((r) => ({ sourceKey: r.sourceKey, retrievedAt: new Date(r.retrievedAt) }));
}
