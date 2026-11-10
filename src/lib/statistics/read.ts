/**
 * What the statistics pages read: a metric's series for every place that has
 * one, the records about it (links to the law, events, enforcement), and the
 * law's own events — the days a linked act's versions took effect — so a
 * timeline marks an amendment without anyone entering it twice.
 */
import { sql } from "drizzle-orm";
import { rowsOf } from "@/lib/db/rows";
import type { PlacesConfig } from "@/lib/config/places/schema";
import type { Database } from "@/lib/db/client";
import { displayName } from "@/lib/places/place-view";
import type { NameType } from "@/lib/places/vocabulary";
import {
  BODY_SCHEMAS,
  reviewStatus,
  type ActRef,
  type AssessmentBody,
  type EventBody,
  type LawLinkBody,
} from "./records";
import type { StatisticRecordKind } from "./vocabulary";

export interface SeriesPoint {
  /** The calendar year the value describes. */
  year: number;
  value: number;
  /** What the publisher says about the figure; ordinary unless it says otherwise. */
  quality: "normal" | "estimated" | "provisional" | "forecast";
}

export interface PlaceSeries {
  jurisdictionId: string;
  /** ISO 3166-1, or the place's first identifier: what a chart and a URL call it. */
  code: string;
  name: string;
  slugPath: string | null;
  points: SeriesPoint[];
  /** The retrieval the latest value came from. */
  source: { key: string; url: string | null; retrievedAt: string };
}

export interface CurrentRecord {
  id: string;
  kind: StatisticRecordKind;
  recordKey: string;
  metricKey: string | null;
  jurisdictionId: string | null;
  body: unknown;
  assertedBy: string;
  recordedAt: Date;
}

export interface LinkedAct {
  recordKey: string;
  jurisdictionId: string | null;
  link: LawLinkBody;
  /** Our id of the act, when the law register holds it. */
  actId: string | null;
  title: string | null;
  /** The days a version of the act took effect, oldest first. */
  versions: string[];
}

/** The latest row of each record, where that row asserts it. */
export async function currentRecords(
  db: Database,
  {
    metricKeys,
    kinds,
  }: { metricKeys?: readonly string[]; kinds?: readonly StatisticRecordKind[] } = {},
): Promise<CurrentRecord[]> {
  const result = await db.execute(sql`
    SELECT * FROM (
      SELECT DISTINCT ON (record_key) id, kind, record_key, state, metric_key, jurisdiction_id,
             body, asserted_by, recorded_at
      FROM statistic_records
      ORDER BY record_key, recorded_at DESC, id DESC
    ) latest
    WHERE state = 'asserted'
      ${
        metricKeys
          ? sql`AND metric_key IN (${sql.join(
              metricKeys.map((k) => sql`${k}`),
              sql`, `,
            )})`
          : sql``
      }
      ${
        kinds
          ? sql`AND kind IN (${sql.join(
              kinds.map((k) => sql`${k}`),
              sql`, `,
            )})`
          : sql``
      }
    ORDER BY record_key
  `);
  return rowsOf<{
    id: string;
    kind: StatisticRecordKind;
    record_key: string;
    metric_key: string | null;
    jurisdiction_id: string | null;
    body: unknown;
    asserted_by: string;
    recorded_at: Date | string;
  }>(result).map((r) => ({
    id: r.id,
    kind: r.kind,
    recordKey: r.record_key,
    metricKey: r.metric_key,
    jurisdictionId: r.jurisdiction_id,
    body: BODY_SCHEMAS[r.kind].parse(r.body),
    assertedBy: r.asserted_by,
    recordedAt: new Date(r.recorded_at),
  }));
}

/** A metric's current yearly values, per place, each place named for the reader. */
export async function loadSeries(
  db: Database,
  config: PlacesConfig,
  metricKey: string,
  locale: string,
): Promise<PlaceSeries[]> {
  const facts = rowsOf<{
    jurisdiction_id: string;
    valid_from: string;
    value: string;
    quality: SeriesPoint["quality"];
    source_key: string;
    url: string | null;
    retrieved_at: Date | string;
  }>(
    await db.execute(sql`
      SELECT f.jurisdiction_id, f.valid_from::text AS valid_from, f.value_numeric::text AS value,
             f.quality, s.source_key, s.url, s.retrieved_at
      FROM facts f JOIN sources s ON s.id = f.source_id
      WHERE f.metric_key = ${metricKey} AND f.superseded_at IS NULL AND f.value_numeric IS NOT NULL
        AND f.variant IS NULL
      ORDER BY f.jurisdiction_id, f.valid_from
    `),
  );
  if (facts.length === 0) {
    return [];
  }
  const ids = [...new Set(facts.map((f) => f.jurisdiction_id))];
  const places = await placeLabels(db, config, ids, locale);
  const byPlace = new Map<string, PlaceSeries>();
  for (const f of facts) {
    const place = places.get(f.jurisdiction_id)!;
    let series = byPlace.get(f.jurisdiction_id);
    if (!series) {
      series = { jurisdictionId: f.jurisdiction_id, ...place, points: [], source: sourceOf(f) };
      byPlace.set(f.jurisdiction_id, series);
    }
    series.points.push({
      year: Number(f.valid_from.slice(0, 4)),
      value: Number(f.value),
      quality: f.quality,
    });
    series.source = sourceOf(f); // ordered by period, so the last is the latest value's
  }
  return [...byPlace.values()].sort((a, b) => a.name.localeCompare(b.name, locale));
}

const sourceOf = (f: { source_key: string; url: string | null; retrieved_at: Date | string }) => ({
  key: f.source_key,
  url: f.url,
  retrievedAt: new Date(f.retrieved_at).toISOString().slice(0, 10),
});

/** Names and codes of places, for charts: the place's own name in the reader's language. */
export async function placeLabels(
  db: Database,
  config: PlacesConfig,
  ids: readonly string[],
  locale: string,
): Promise<Map<string, { code: string; name: string; slugPath: string | null }>> {
  const list = sql.join(
    ids.map((id) => sql`${id}`),
    sql`, `,
  );
  const [places, names, codes] = await Promise.all([
    db.execute(sql`SELECT id, country_pack, slug_path FROM jurisdictions WHERE id IN (${list})`),
    db.execute(sql`
      SELECT jurisdiction_id, locale, script, name, name_type FROM jurisdiction_names
      WHERE jurisdiction_id IN (${list}) AND superseded_at IS NULL AND valid_to IS NULL`),
    db.execute(sql`
      SELECT jurisdiction_id, scheme, value FROM jurisdiction_identifiers
      WHERE jurisdiction_id IN (${list}) AND superseded_at IS NULL
      ORDER BY (scheme = 'iso_3166_1') DESC, scheme`),
  ]);
  const out = new Map<string, { code: string; name: string; slugPath: string | null }>();
  for (const p of rowsOf<{ id: string; country_pack: string | null; slug_path: string | null }>(
    places,
  )) {
    const own = rowsOf<{
      jurisdiction_id: string;
      locale: string;
      script: string | null;
      name: string;
      name_type: NameType;
    }>(names)
      .filter((n) => n.jurisdiction_id === p.id)
      .map((n) => ({ locale: n.locale, script: n.script, name: n.name, nameType: n.name_type }));
    const pack = config.packs.find((k) => k.key === p.country_pack);
    const code =
      rowsOf<{ jurisdiction_id: string; value: string }>(codes).find(
        (c) => c.jurisdiction_id === p.id,
      )?.value ?? p.id.slice(0, 8);
    // A country is named as the reader's language names it ("Switzerland",
    // not "Schweiz"); any other place by its own name.
    const country = rowsOf<{ jurisdiction_id: string; scheme: string; value: string }>(codes).find(
      (c) => c.jurisdiction_id === p.id && c.scheme === "iso_3166_1",
    );
    const countryName = country ? regionName(country.value, locale) : null;
    out.set(p.id, {
      code,
      name: countryName ?? (displayName(own as never, locale, pack?.defaultLocales ?? []) || code),
      slugPath: p.slug_path,
    });
  }
  return out;
}

/**
 * The acts a metric's records link to, resolved in the law register by their
 * identifiers, with the days their versions took effect. An act the register
 * does not hold yet is still listed, with its publisher's page from the
 * record's evidence, so the link is never a dead end.
 */
export async function linkedActs(
  db: Database,
  records: readonly CurrentRecord[],
  locale: string,
): Promise<LinkedAct[]> {
  const links = records.filter((r) => r.kind === "law_link");
  const out: LinkedAct[] = [];
  for (const record of links) {
    const link = record.body as LawLinkBody;
    const actId = await findAct(db, link.act);
    let title: string | null = null;
    let versions: string[] = [];
    if (actId) {
      const [names, dates] = await Promise.all([
        db.execute(sql`
          SELECT locale, text FROM legal_act_names
          WHERE act_id = ${actId} AND kind = 'title' AND superseded_at IS NULL`),
        db.execute(sql`
          SELECT DISTINCT in_force_from::text AS day FROM legal_act_versions
          WHERE act_id = ${actId} AND date_basis = 'publisher' ORDER BY day`),
      ]);
      const titles = rowsOf<{ locale: string; text: string }>(names);
      title =
        (
          titles.find((t) => t.locale === locale) ??
          titles.find((t) => t.locale === "en") ??
          titles[0]
        )?.text ?? null;
      versions = rowsOf<{ day: string }>(dates).map((d) => d.day);
    }
    out.push({
      recordKey: record.recordKey,
      jurisdictionId: record.jurisdictionId,
      link,
      actId,
      title,
      versions,
    });
  }
  return out;
}

/** Solon's id of the act a reference names, when the register holds it. */
export async function findAct(db: Database, act: ActRef): Promise<string | null> {
  const rows = rowsOf<{ id: string }>(
    await db.execute(sql`
      SELECT a.id FROM legal_acts a
      JOIN legal_act_identifiers i ON i.act_id = a.id AND i.superseded_at IS NULL
      WHERE a.authority = ${act.authority} AND i.scheme = ${act.scheme} AND i.value = ${act.value}
      ORDER BY a.in_force DESC LIMIT 1`),
  );
  return rows[0]?.id ?? null;
}

function regionName(code: string, locale: string): string | null {
  try {
    return new Intl.DisplayNames([locale], { type: "region", fallback: "none" }).of(code) ?? null;
  } catch {
    return null;
  }
}

export interface EventRow {
  recordKey: string;
  jurisdictionId: string;
  body: EventBody;
  placeCode: string;
  placeName: string;
}

/** Every event currently asserted, with its place named for the reader, newest decision first. */
export async function loadEvents(
  db: Database,
  config: PlacesConfig,
  locale: string,
): Promise<EventRow[]> {
  const records = await currentRecords(db, { kinds: ["event"] });
  const ids = [...new Set(records.flatMap((r) => (r.jurisdictionId ? [r.jurisdictionId] : [])))];
  if (ids.length === 0) return [];
  const labels = await placeLabels(db, config, ids, locale);
  return records
    .filter((r) => r.jurisdictionId && labels.has(r.jurisdictionId))
    .map((r) => {
      const label = labels.get(r.jurisdictionId!)!;
      return {
        recordKey: r.recordKey,
        jurisdictionId: r.jurisdictionId!,
        body: r.body as EventBody,
        placeCode: label.code,
        placeName: label.name,
      };
    })
    .sort((a, b) => b.body.on.localeCompare(a.body.on));
}

/** The law register's act for a reference, with its title and the days its versions took effect. */
export async function actFor(
  db: Database,
  act: ActRef | undefined,
  locale: string,
): Promise<{ actId: string | null; title: string | null; versions: string[] } | null> {
  if (!act) return null;
  const actId = await findAct(db, act);
  if (!actId) return { actId: null, title: null, versions: [] };
  const [names, dates] = await Promise.all([
    db.execute(sql`
      SELECT locale, text FROM legal_act_names
      WHERE act_id = ${actId} AND kind = 'title' AND superseded_at IS NULL`),
    db.execute(sql`
      SELECT DISTINCT in_force_from::text AS day FROM legal_act_versions
      WHERE act_id = ${actId} AND date_basis = 'publisher' ORDER BY day`),
  ]);
  const titles = rowsOf<{ locale: string; text: string }>(names);
  const title =
    (titles.find((t) => t.locale === locale) ?? titles.find((t) => t.locale === "en") ?? titles[0])
      ?.text ?? null;
  return { actId, title, versions: rowsOf<{ day: string }>(dates).map((d) => d.day) };
}

export interface AssessmentRow {
  recordKey: string;
  jurisdictionId: string;
  placeCode: string;
  placeName: string;
  body: AssessmentBody;
  status: "settled" | "awaiting_review";
  /** Where each provision can be read in Solon's law register, when it holds the act. */
  provisions: { label: string; actId: string | null; provision: string | null }[];
}

/** The codings currently asserted for the given rubrics, each with its place named and where its articles can be read. */
export async function loadAssessments(
  db: Database,
  config: PlacesConfig,
  rubricKeys: readonly string[],
  locale: string,
): Promise<AssessmentRow[]> {
  const records = (await currentRecords(db, { kinds: ["assessment"] })).filter((r) =>
    rubricKeys.includes((r.body as AssessmentBody).rubric),
  );
  const ids = [...new Set(records.flatMap((r) => (r.jurisdictionId ? [r.jurisdictionId] : [])))];
  if (ids.length === 0) return [];
  const labels = await placeLabels(db, config, ids, locale);
  const rows: AssessmentRow[] = [];
  for (const r of records) {
    const label = r.jurisdictionId ? labels.get(r.jurisdictionId) : undefined;
    if (!r.jurisdictionId || !label) continue;
    const body = r.body as AssessmentBody;
    const provisions = [];
    for (const p of body.provisions) {
      provisions.push({
        label: p.label,
        actId: await findAct(db, p.act),
        provision: p.provision,
      });
    }
    rows.push({
      recordKey: r.recordKey,
      jurisdictionId: r.jurisdictionId,
      placeCode: label.code,
      placeName: label.name,
      body,
      status: reviewStatus(body),
      provisions,
    });
  }
  return rows.sort((a, b) => a.placeName.localeCompare(b.placeName, locale));
}
