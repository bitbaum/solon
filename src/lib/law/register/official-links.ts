/**
 * Each act's own page at the authority that publishes it (design L3: "the
 * register of what exists ... with its official link").
 *
 * LexFind's search results carry, for every act, the address of the act in its
 * authority's own collection (`original_url`): the canton's page for a cantonal
 * act, Fedlex's for a federal one. A search by systematic number, one digit at
 * a time, lists every numbered act of an authority, a hundred to a page. The
 * link is kept as the act's `official_url`, so every act points to the place
 * that publishes it, not to LexFind.
 *
 * A list well short of the count the register states (under 95%) is refused. A
 * few acts are always missing, those whose number has no digit; the snapshot
 * says how many per authority.
 */
import { and, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { LEXFIND } from "@/lib/config/law";
import type { Database } from "@/lib/db/client";
import { legalActIdentifiers } from "@/lib/db/law-schema";
import { placeImportRuns, sources } from "@/lib/db/places-schema";
import { sha256Hex, type SnapshotStore } from "@/lib/places/importer/snapshots";
import { BASE, getJson, sleep } from "./lexfind";

export const LINKS_IMPORTER_VERSION = "law-links-1";
const CHUNK = 1000;

const entitySchema = z.object({
  id: z.number().int(),
  abbreviation: z.string().min(1),
  status: z.object({ active_texts_of_law: z.number().int() }),
});
const searchCreated = z.object({ id: z.number().int(), session_id: z.string() });
const searchPage = z.object({
  number_of_pages: z.number().int(),
  texts_of_law_with_matches: z.array(
    z.object({
      id: z.number().int(),
      dta_urls: z
        .array(z.object({ language: z.string(), original_url: z.string().nullable() }))
        .optional(),
    }),
  ),
});

export const linksSnapshotSchema = z.object({
  fetchedAt: z.string(),
  /** Acts in force the search did not find, per authority (no digit in their number). */
  missing: z.record(z.string(), z.number().int()).optional(),
  authorities: z.array(
    z.object({
      code: z.string().min(1),
      /** The register's id of the act and the German page it points to. */
      links: z.array(z.object({ id: z.number().int(), url: z.string().url() })),
    }),
  ),
});
export type LinksSnapshot = z.infer<typeof linksSnapshotSchema>;

export const parseLinksSnapshot = (bytes: Uint8Array): LinksSnapshot =>
  linksSnapshotSchema.parse(JSON.parse(new TextDecoder().decode(bytes)));

/** Every in-force act of every authority the register lists, with the link to its own page. */
export async function fetchOfficialLinks(
  doFetch: typeof fetch = fetch,
  onProgress: (code: string, links: number) => void = () => undefined,
  pauseMs = 300,
): Promise<LinksSnapshot> {
  const entities = z.array(entitySchema).parse(await getJson(doFetch, `${BASE}/entities/extended`));
  const authorities: LinksSnapshot["authorities"] = [];
  const missing: Record<string, number> = {};
  for (const entity of entities) {
    const found = new Map<number, string | null>();
    for (const digit of "0123456789") {
      const created = searchCreated.parse(
        await getJson(doFetch, `${BASE}/fulltext-search`, {
          search_text: digit,
          entity_filter: [entity.id],
          active_only: true,
          search_in_systematic_number: true,
          search_in_title: false,
          search_in_keywords: false,
          search_in_content: false,
          systematic_filter: [],
          category_filter: [],
          use_global_systematics: false,
          direct_search: false,
        }),
      );
      for (let page = 1; ; page++) {
        const result = searchPage.parse(
          await getJson(
            doFetch,
            `${BASE}/fulltext-search/${created.id}?session_id=${created.session_id}&page_no=${page}&results_per_page=100`,
          ),
        );
        for (const act of result.texts_of_law_with_matches) {
          const german = act.dta_urls?.find((u) => u.language === "de") ?? act.dta_urls?.[0];
          found.set(act.id, german?.original_url ?? null);
        }
        if (page >= result.number_of_pages) break;
        await sleep(pauseMs);
      }
      await sleep(pauseMs);
    }
    // Acts with no digit in their systematic number are not found by this search. A short list is
    // safe here, unlike the register's: links are only ever added or replaced, never taken away
    // for an act missing from a list. But a list far short means the read went wrong.
    const stated = entity.status.active_texts_of_law;
    if (found.size < stated * 0.95 || found.size > stated) {
      throw new Error(
        `${entity.abbreviation}: found ${found.size} acts in force, the register states ${stated}`,
      );
    }
    missing[entity.abbreviation] = stated - found.size;
    const links = [...found].flatMap(([id, url]) => (url ? [{ id, url }] : []));
    authorities.push({ code: entity.abbreviation, links });
    onProgress(entity.abbreviation, links.length);
  }
  return { fetchedAt: new Date().toISOString(), authorities, missing };
}

export interface LinksReport {
  status: "applied" | "dry_run" | "failed";
  sourceId: string | null;
  contentSha256: string | null;
  /** Links read from the register. */
  read: number;
  linksInserted: number;
  linksSuperseded: number;
  /** Links for acts the register does not hold (yet). */
  unknownActs: number;
  problems: string[];
}

class DryRunDone extends Error {}

/** Applies a stored retrieval: one `official_url` per act, a changed one superseding the old. */
export async function importOfficialLinks(
  db: Database,
  options: {
    bytes: Uint8Array;
    url: string | null;
    retrievedAt: Date;
    snapshots: SnapshotStore;
    dryRun?: boolean;
  },
): Promise<LinksReport> {
  const { dryRun = false } = options;
  const [run] = await db
    .insert(placeImportRuns)
    .values({ sourceKey: `${LEXFIND.key}-links`, status: "running", report: {} })
    .returning({ id: placeImportRuns.id });
  const report: LinksReport = {
    status: "failed",
    sourceId: null,
    contentSha256: null,
    read: 0,
    linksInserted: 0,
    linksSuperseded: 0,
    unknownActs: 0,
    problems: [],
  };
  try {
    const sha = sha256Hex(options.bytes);
    report.contentSha256 = sha;
    const snapshot = parseLinksSnapshot(options.bytes);
    const snapshotKey = await options.snapshots.put(sha, options.bytes);
    const wanted = new Map(
      snapshot.authorities.flatMap((a) => a.links).map((l) => [String(l.id), l.url]),
    );
    report.read = wanted.size;
    try {
      await db.transaction(async (tx) => {
        const [source] = await tx
          .insert(sources)
          .values({
            sourceKey: `${LEXFIND.key}-links`,
            retrievedAt: options.retrievedAt,
            url: options.url,
            contentSha256: sha,
            snapshotKey,
            importerVersion: LINKS_IMPORTER_VERSION,
            licenceSpdx: LEXFIND.licenceSpdx,
          })
          .returning({ id: sources.id });
        report.sourceId = source!.id;

        const acts = await tx
          .select({ actId: legalActIdentifiers.actId, lexfindId: legalActIdentifiers.value })
          .from(legalActIdentifiers)
          .where(
            and(
              eq(legalActIdentifiers.scheme, "lexfind_id"),
              isNull(legalActIdentifiers.supersededAt),
            ),
          );
        const actOf = new Map(acts.map((row) => [row.lexfindId, row.actId]));
        const held = await tx
          .select({
            id: legalActIdentifiers.id,
            actId: legalActIdentifiers.actId,
            value: legalActIdentifiers.value,
          })
          .from(legalActIdentifiers)
          .where(
            and(
              eq(legalActIdentifiers.scheme, "official_url"),
              isNull(legalActIdentifiers.supersededAt),
            ),
          );
        const heldOf = new Map(held.map((row) => [row.actId, row]));

        const insert: (typeof legalActIdentifiers.$inferInsert)[] = [];
        const supersede: string[] = [];
        for (const [lexfindId, url] of wanted) {
          const actId = actOf.get(lexfindId);
          if (!actId) {
            report.unknownActs++;
            continue;
          }
          const current = heldOf.get(actId);
          if (current?.value === url) continue;
          if (current) supersede.push(current.id);
          insert.push({ actId, scheme: "official_url", value: url, sourceId: source!.id });
        }
        const now = new Date();
        // Superseded first: one current link per act.
        for (let i = 0; i < supersede.length; i += CHUNK) {
          await tx
            .update(legalActIdentifiers)
            .set({ supersededAt: now })
            .where(inArray(legalActIdentifiers.id, supersede.slice(i, i + CHUNK)));
        }
        for (let i = 0; i < insert.length; i += CHUNK) {
          await tx.insert(legalActIdentifiers).values(insert.slice(i, i + CHUNK));
        }
        report.linksInserted = insert.length;
        report.linksSuperseded = supersede.length;
        if (dryRun) throw new DryRunDone();
      });
      report.status = "applied";
    } catch (error) {
      if (!(error instanceof DryRunDone)) throw error;
      report.status = "dry_run";
      report.sourceId = null;
    }
  } catch (error) {
    report.problems.push(error instanceof Error ? error.message : String(error));
  }
  await db
    .update(placeImportRuns)
    .set({
      status: report.status,
      sourceId: report.status === "applied" ? report.sourceId : null,
      report,
      finishedAt: new Date(),
    })
    .where(eq(placeImportRuns.id, run!.id));
  return report;
}
