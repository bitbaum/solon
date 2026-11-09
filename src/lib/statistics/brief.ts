/**
 * What a statistic's page says, as numbered facts: the figures, how they moved,
 * how places compare, which events fall in the years shown, what the checks
 * found. Computed from the page's own figures with no model. It is both the
 * plain-words reading shown on the page and the only material an AI
 * explanation may draw on (explain.ts): a sentence in an explanation that
 * does not rest on a fact here is refused.
 */
import type { Metric } from "@/lib/config/places/schema";
import { localized } from "@/lib/places/place-view";
import { chartValue, eventPath, metricPath } from "./present";
import { assessSeries } from "./quality";
import type { EventRow, PlaceSeries } from "./read";
import type { SanityFinding } from "./sanity";

export type BriefKind =
  | "definition"
  | "latest"
  | "change"
  | "rank"
  | "event"
  | "quality"
  | "caution"
  | "coded"
  | "gap"
  | "empty";

export interface BriefFact {
  /** `F1`, `F2` …: what an explanation cites and the page anchors. */
  id: string;
  kind: BriefKind;
  /** Language-neutral values, numbers already written for the reader. */
  params: Record<string, string | number>;
  href?: string;
}

export interface BriefInput {
  metric: Metric;
  shown: readonly PlaceSeries[];
  years: { from: number | null; to: number | null };
  events: readonly EventRow[];
  sanity: readonly SanityFinding[];
  thisYear: number;
  /** The unit word for a rate, in the reader's language. */
  per100k?: string;
}

/** A value as a reader reads it: per cent for a ratio, "per 100,000" for a rate. */
export function valueText(
  metric: Pick<Metric, "unit">,
  value: number,
  locale: string,
  per100k = "per 100,000",
): string {
  const shown = chartValue(metric, value).toLocaleString(locale);
  if (metric.unit === "ratio") return `${shown}%`;
  if (metric.unit === "per_100k") return `${shown} ${per100k}`;
  return shown;
}

/** The size of a change between two values, as a number; `pp` is 1 when it is percentage points. */
export function deltaOf(
  metric: Pick<Metric, "unit">,
  from: number,
  to: number,
  locale: string,
): { delta: string; pp: 0 | 1 } {
  const d = Math.abs(chartValue(metric, to) - chartValue(metric, from));
  return {
    delta: (Math.round(d * 1000) / 1000).toLocaleString(locale),
    pp: metric.unit === "ratio" ? 1 : 0,
  };
}

export function buildBrief(input: BriefInput, locale: string): BriefFact[] {
  const { metric, shown, years, events, sanity, thisYear, per100k } = input;
  const facts: Omit<BriefFact, "id">[] = [];
  const statistic = metric.statistic!;
  facts.push({
    kind: "definition",
    params: {
      metric: localized(metric.label, locale),
      definition: localized(statistic.definition, locale),
      ...(statistic.scope ? { scope: localized(statistic.scope, locale) } : {}),
      publisher: statistic.series.publisher,
    },
    href: statistic.series.url,
  });

  const inRange = (year: number) =>
    (years.from === null || year >= years.from) && (years.to === null || year <= years.to);
  const latest: { name: string; year: number; value: number; text: string }[] = [];
  for (const s of shown) {
    const points = s.points.filter((p) => inRange(p.year));
    const last = points.at(-1);
    if (!last) continue;
    const text = valueText(metric, last.value, locale, per100k);
    latest.push({ name: s.name, year: last.year, value: last.value, text });
    facts.push({
      kind: "latest",
      params: {
        place: s.name,
        year: last.year,
        value: text,
        ...(last.quality !== "normal" ? { flag: last.quality } : {}),
      },
      href: `${metricPath(metric.key)}?p=${s.code}`,
    });
    const first = points[0]!;
    if (points.length >= 2) {
      facts.push({
        kind: "change",
        params: {
          place: s.name,
          fromYear: first.year,
          fromValue: valueText(metric, first.value, locale, per100k),
          toYear: last.year,
          toValue: text,
          direction: last.value > first.value ? "up" : last.value < first.value ? "down" : "same",
          ...deltaOf(metric, first.value, last.value, locale),
        },
        href: `${metricPath(metric.key)}?p=${s.code}`,
      });
    }
  }
  if (latest.length >= 2) {
    const ordered = [...latest].sort((a, b) => b.value - a.value);
    facts.push({
      kind: "rank",
      params: {
        order: ordered.map((l) => `${l.name} ${l.text} (${l.year})`).join("; "),
        highest: ordered[0]!.name,
        lowest: ordered.at(-1)!.name,
      },
    });
  }

  const shownEvents = events
    .filter((e) => inRange(Number(e.body.on.slice(0, 4))))
    .sort((a, b) => a.body.on.localeCompare(b.body.on));
  for (const e of shownEvents) {
    facts.push({
      kind: "event",
      params: {
        place: e.placeName,
        date: e.body.on,
        title: localized(e.body.title, locale),
        category: e.body.category,
      },
      href: eventPath(e.body.slug),
    });
  }

  for (const s of shown) {
    const q = assessSeries(s, thisYear);
    for (const n of q.notes) {
      facts.push({
        kind: "quality",
        params: { place: s.name, note: n.kind, years: n.years.slice(0, 8).join(", ") },
      });
    }
  }
  for (const f of sanity) {
    facts.push({
      kind: "caution",
      params: { note: f.kind, places: f.places.join(", "), years: f.years.join(", ") },
    });
  }
  return facts.map((f, i) => ({ ...f, id: `F${i + 1}` }));
}
