/**
 * What a dimension's page says, as numbered facts (see brief.ts): each
 * layer's measures with their latest figures, what has been coded from the
 * law and who has checked it, the gap between two measures where they share a
 * unit, what an empty layer still needs, and what the checks found.
 */
import { localized } from "@/lib/places/place-view";
import { metricPath } from "./present";
import { reviewStatus } from "./records";
import { DIMENSION_LAYERS } from "./dimensions";
import { deltaOf, valueText, type BriefFact } from "./brief";
import type { loadDimensionPage } from "./dimension-page";

type Page = NonNullable<Awaited<ReturnType<typeof loadDimensionPage>>>;

const LAYER_NAMES = {
  de_jure: "de jure (what the law says)",
  de_facto: "de facto (what happens in practice)",
  outcome: "outcome (what results)",
};

export function buildDimensionBrief(page: Page, locale: string, per100k?: string): BriefFact[] {
  const facts: Omit<BriefFact, "id">[] = [];
  const { dimension } = page;
  facts.push({
    kind: "definition",
    params: {
      metric: localized(dimension.label, locale),
      definition: localized(dimension.summary, locale),
      publisher: dimension.author.replace(/\.$/, ""),
    },
  });

  for (const layer of DIMENSION_LAYERS) {
    const here = page.measures.filter((m) => m.layer === layer);
    const coded = page.coded.filter((c) => c.layer === layer);
    if (here.length === 0 && coded.length === 0) {
      facts.push({
        kind: "empty",
        params: {
          layer: LAYER_NAMES[layer],
          layerKey: layer,
          wanted: dimension.layers[layer].wanted
            ? localized(dimension.layers[layer].wanted!, locale)
            : "(not stated)",
        },
      });
    }
    for (const { rubric, rows } of coded) {
      for (const r of rows) {
        const point = rubric.scale.find((p) => p.value === r.body.value);
        facts.push({
          kind: "coded",
          params: {
            place: r.placeName,
            rubric: localized(rubric.label, locale),
            value: r.body.value,
            label: point ? localized(point.label, locale) : "",
            confidence: r.body.confidence,
            status:
              reviewStatus(r.body) === "settled"
                ? "checked by a second reader"
                : "not yet checked by a second reader",
            reading: localized(r.body.reading, locale),
          },
        });
      }
    }
    for (const m of here) {
      for (const s of m.series) {
        const p = s.points.at(-1);
        if (!p) continue;
        facts.push({
          kind: "latest",
          params: {
            metric: localized(m.metric.label, locale),
            layer,
            place: s.name,
            year: p.year,
            value: valueText(m.metric, p.value, locale, per100k),
            ...(p.quality !== "normal" ? { flag: p.quality } : {}),
          },
          href: `${metricPath(m.metric.key)}?p=${s.code}`,
        });
      }
    }
  }

  if (page.x && page.y && page.x !== page.y) {
    for (const g of page.gaps) {
      facts.push({
        kind: "gap",
        params: {
          place: g.name,
          year: g.year,
          xName: localized(page.x.metric.label, locale),
          x: valueText(page.x.metric, g.x, locale, per100k),
          yName: localized(page.y.metric.label, locale),
          y: valueText(page.y.metric, g.y, locale, per100k),
          ...(g.gap !== null
            ? (({ delta, pp }) => ({ gap: delta, pp }))(deltaOf(page.x.metric, g.x, g.y, locale))
            : {}),
        },
      });
    }
  }
  for (const f of page.sanity) {
    facts.push({
      kind: "caution",
      params: { note: f.kind, places: f.places.join(", "), years: f.years.join(", ") },
    });
  }
  return facts.map((f, i) => ({ ...f, id: `F${i + 1}` }));
}
