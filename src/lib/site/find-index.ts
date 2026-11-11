/**
 * What the Find palette can open without a request: the statistics catalog
 * (series, dimensions, how rankings are made, the gaps topics), named in the
 * reader's language. Built on the server from the same config the pages read,
 * so a page that is added there is found here and nothing is listed twice by
 * hand. Pages come from the site map (site-config.ts) and places and acts
 * from the live search APIs.
 */
import { placesConfig } from "@/lib/config/places";
import { DIMENSIONS } from "@/lib/config/statistics/dimensions";
import { GAPS } from "@/lib/config/statistics/gaps";
import { METHODOLOGIES } from "@/lib/config/statistics/methodologies";
import { localized } from "@/lib/places/place-view";
import { topicHref } from "@/lib/statistics/gaps";
import { metricPath, statisticMetrics } from "@/lib/statistics/present";

export interface FindEntry {
  /** What kind it is, for the group heading. */
  group: "series" | "dimension" | "method" | "gaps";
  title: string;
  /** A line of what it is; searched too. */
  description: string;
  href: string;
}

const clip = (text: string, n = 110) => (text.length > n ? `${text.slice(0, n).trimEnd()}…` : text);

export function findIndex(locale: string): FindEntry[] {
  return [
    ...statisticMetrics(placesConfig).map((m) => ({
      group: "series" as const,
      title: localized(m.label, locale),
      description: clip(localized(m.statistic!.definition, locale)),
      href: metricPath(m.key),
    })),
    ...DIMENSIONS.map((d) => ({
      group: "dimension" as const,
      title: localized(d.label, locale),
      description: clip(localized(d.summary, locale)),
      href: `/statistics/dimension/${d.key}`,
    })),
    ...METHODOLOGIES.map((m) => ({
      group: "method" as const,
      title: m.name,
      description: clip(`${m.publisher}. ${localized(m.claims, locale)}`),
      href: `/statistics/methods/${m.key}`,
    })),
    ...GAPS.topics.map((t) => ({
      group: "gaps" as const,
      title: localized(t.label, locale),
      description: clip(localized(t.question, locale)),
      href: topicHref(t.key),
    })),
  ];
}
