/**
 * The tools a research run (research.ts) may call, all read-only and all
 * answering from what Solon holds: the metric catalog, the dimensions, the
 * method descriptions, series from the database and the law register, plus the
 * open web where a backend is configured. Every fact a tool finds comes back
 * as a source with its own address, so a report can be traced to it.
 */
import { readPage, webSearch, type WebEnv } from "@bitbaum/ai-kit/web";
import { DIMENSIONS } from "@/lib/config/statistics/dimensions";
import { GAPS } from "@/lib/config/statistics/gaps";
import { METHODOLOGIES } from "@/lib/config/statistics/methodologies";
import type { PlacesConfig } from "@/lib/config/places/schema";
import type { Database } from "@/lib/db/client";
import { searchProvisions } from "@/lib/law/search";
import { SITE } from "@/lib/law/site";
import { localized } from "@/lib/places/place-view";
import { buildBrief } from "./brief";
import { buildDimensionBrief } from "./dimension-brief";
import { loadDimensionPage } from "./dimension-page";
import { factText } from "./explain";
import { buildGapsBrief } from "./gaps-brief";
import { buildMethodBrief } from "./method-brief";
import { loadMetricPage } from "./metric-page";
import { metricPath, statisticMetrics } from "./present";
import type { ResearchTools, ToolResult } from "./research";

export const webConfigured = (env: WebEnv): boolean =>
  Boolean(
    env.SEARXNG_URL?.trim() || env.BRAVE_SEARCH_API_KEY?.trim() || env.TAVILY_API_KEY?.trim(),
  );

const spec = (
  name: string,
  description: string,
  properties: Record<string, unknown>,
  required: string[] = [],
) => ({
  type: "function" as const,
  function: { name, description, parameters: { type: "object", properties, required } },
});

const SPECS = [
  spec(
    "search_catalog",
    "Find what Solon holds on a subject: statistical series, dimensions and descriptions of published rankings, by words in their names and definitions. Returns keys to read with the other tools.",
    { query: { type: "string" } },
    ["query"],
  ),
  spec(
    "read_series",
    "Read one statistical series by its key: its definition, what it covers, the latest figure per place, change over the years, the ranking, the law's changes that fall in the years, and data-quality notes. Optionally only some places (ISO codes).",
    { metric: { type: "string" }, places: { type: "array", items: { type: "string" } } },
    ["metric"],
  ),
  spec(
    "read_dimension",
    "Read a dimension by its key: what the law says, what happens in practice and what results, kept apart, with the features coded from statutes and who has checked them.",
    { key: { type: "string" } },
    ["key"],
  ),
  spec(
    "read_method",
    "Read how a published ranking or rating is made, by its key: who makes it, what it measures, its parts, whether its data may be shown, what has not been read, and the questions to ask of it.",
    { key: { type: "string" } },
    ["key"],
  ),
  spec(
    "read_gaps",
    "Read what statistical offices collect on a topic, place by place: which breakdowns each publishes, crossed with what, under what legal frame, where a gap is between places, and the cautions, objections and safeguards. Topic keys come from search_catalog.",
    { topic: { type: "string" } },
    ["topic"],
  ),
  spec(
    "search_law",
    "Search the provisions in force Solon holds, in the law's own language. Returns the provisions found with their text.",
    { query: { type: "string" }, authorities: { type: "array", items: { type: "string" } } },
    ["query"],
  ),
];

const WEB_SPECS = [
  spec(
    "web_search",
    "Search the open web, for a publisher's own page on a figure or an index. Returns titles, links and snippets; read a page with web_read. Web pages are not law and not Solon's data.",
    { query: { type: "string" } },
    ["query"],
  ),
  spec(
    "web_read",
    "Read one web page found by web_search, as text, to cite it.",
    { url: { type: "string" } },
    ["url"],
  ),
];

const words = (q: string) =>
  q
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length > 2);

/** How well a text matches a query: the share of its words found. */
const score = (text: string, q: string[]) => {
  const t = text.toLowerCase();
  return q.length === 0 ? 0 : q.filter((w) => t.includes(w)).length / q.length;
};

export function researchTools(deps: {
  db: Database;
  config: PlacesConfig;
  env: WebEnv;
  locale?: string;
}): ResearchTools {
  const { db, config, env } = deps;
  const locale = "en";
  const web = webConfigured(env);
  const thisYear = () => new Date().getUTCFullYear();

  async function run(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    const str = (k: string) => String(args[k] ?? "").trim();
    switch (name) {
      case "search_catalog": {
        const q = words(str("query"));
        const hits = [
          ...statisticMetrics(config).map((m) => ({
            kind: "series",
            key: m.key,
            label: localized(m.label, locale),
            text: `${localized(m.label, locale)} ${localized(m.statistic!.definition, locale)}`,
          })),
          ...DIMENSIONS.map((d) => ({
            kind: "dimension",
            key: d.key,
            label: localized(d.label, locale),
            text: `${localized(d.label, locale)} ${localized(d.summary, locale)}`,
          })),
          ...GAPS.topics.map((t) => ({
            kind: "gaps",
            key: t.key,
            label: localized(t.label, locale),
            text: `${localized(t.label, locale)} ${localized(t.question, locale)}`,
          })),
          ...METHODOLOGIES.map((m) => ({
            kind: "method",
            key: m.key,
            label: m.name,
            text: `${m.name} ${m.publisher} ${localized(m.claims, locale)} ${m.components.join(" ")}`,
          })),
        ]
          .map((h) => ({ ...h, s: score(h.text, q) }))
          .filter((h) => h.s > 0)
          .sort((a, b) => b.s - a.s)
          .slice(0, 8);
        return {
          summary: hits.length
            ? hits.map((h) => `${h.kind} "${h.key}": ${h.label}`).join("\n")
            : "nothing matched; try other words, or search_law for the law",
        };
      }
      case "read_series": {
        const metric = str("metric");
        const places = Array.isArray(args.places) ? args.places.map(String).slice(0, 12) : [];
        const page = await loadMetricPage(db, config, metric, locale, { places });
        if (!page) return { summary: `no series "${metric}"; use search_catalog for keys` };
        const facts = buildBrief({ ...page, thisYear: thisYear() }, locale);
        return {
          summary: `${facts.length} facts about ${metric}`,
          sources: facts.map((f) => ({
            text: factText(f),
            href: f.href
              ? f.href.startsWith("/")
                ? `${SITE}${f.href}`
                : f.href
              : `${SITE}${metricPath(metric)}`,
          })),
        };
      }
      case "read_dimension": {
        const key = str("key");
        const page = await loadDimensionPage(db, config, key, locale, {});
        if (!page) return { summary: `no dimension "${key}"; use search_catalog for keys` };
        const facts = buildDimensionBrief(page, locale);
        return {
          summary: `${facts.length} facts about the dimension ${key}`,
          sources: facts.map((f) => ({
            text: factText(f),
            href: f.href
              ? f.href.startsWith("/")
                ? `${SITE}${f.href}`
                : f.href
              : `${SITE}/statistics/dimension/${key}`,
          })),
        };
      }
      case "read_method": {
        const m = METHODOLOGIES.find((x) => x.key === str("key"));
        if (!m) return { summary: `no method "${str("key")}"; use search_catalog for keys` };
        const facts = buildMethodBrief(m);
        return {
          summary: `${facts.length} facts about ${m.name}`,
          sources: facts.map((f) => ({
            text: factText(f),
            href: f.href ?? `${SITE}/statistics/methods/${m.key}`,
          })),
        };
      }
      case "read_gaps": {
        const topic = GAPS.topics.find((x) => x.key === str("topic"));
        if (!topic) return { summary: `no topic "${str("topic")}"; use search_catalog for keys` };
        const names = new Intl.DisplayNames(["en"], { type: "region" });
        const facts = buildGapsBrief(topic, GAPS.coverage, (a2) => names.of(a2) ?? a2);
        return {
          summary: `${facts.length} facts about ${topic.key}`,
          sources: facts.map((f) => ({
            text: factText(f),
            href: f.href ?? `${SITE}/statistics/gaps/${topic.key}`,
          })),
        };
      }
      case "search_law": {
        const found = await searchProvisions(db, {
          q: str("query"),
          authorities: Array.isArray(args.authorities) ? args.authorities.map(String) : undefined,
          limit: 5,
        });
        return {
          summary: found.length ? `${found.length} provisions found` : "no provision matched",
          sources: found.map((h) => ({
            text: `${h.title ?? h.systematicNumber ?? h.authority} — ${h.heading}: ${h.text}`,
            href: `${SITE}/law/${h.actId}?at=${encodeURIComponent(h.path)}#${h.path}`,
          })),
        };
      }
      case "web_search": {
        if (!web) return { summary: "the web is not available" };
        const found = await webSearch(str("query").slice(0, 200), { limit: 6 }, { env });
        return {
          summary:
            found.status === "found"
              ? found.results.map((r) => `${r.title} — ${r.url}: ${r.snippet}`).join("\n")
              : `search failed: ${found.status}`,
        };
      }
      case "web_read": {
        if (!web) return { summary: "the web is not available" };
        const page = await readPage(str("url"), { maxChars: 6000, timeoutMs: 10000 });
        return page.ok
          ? {
              summary: `read ${page.title}`,
              sources: [
                {
                  text: `${page.title} (a web page, not law and not Solon's data): ${page.text}`,
                  href: page.url,
                },
              ],
            }
          : { summary: `could not read: ${page.failure.reason}` };
      }
      default:
        return { summary: `no tool named ${name}` };
    }
  }

  return { specs: [...SPECS, ...(web ? WEB_SPECS : [])], web, run };
}
