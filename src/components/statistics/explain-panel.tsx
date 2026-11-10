import { Link } from "@/i18n/navigation";
import type { BriefFact } from "@/lib/statistics/brief";
import type { StatisticsTranslator } from "./shared";
import ExplainButton from "./explain-button";

const str = (v: string | number | undefined) => (v === undefined ? "" : String(v));

/** One fact as the reader's language writes it. */
export function factLine(f: BriefFact, t: StatisticsTranslator): string {
  const p = f.params;
  switch (f.kind) {
    case "definition":
      return t("explain.facts.definition", {
        metric: str(p.metric),
        definition: str(p.definition),
        publisher: str(p.publisher),
      });
    case "latest": {
      const line = t(p.metric ? "explain.facts.latestMetric" : "explain.facts.latest", {
        metric: str(p.metric),
        layer: p.layer ? t(`explain.layers.${str(p.layer)}` as "explain.layers.de_jure") : "",
        place: str(p.place),
        year: str(p.year),
        value: str(p.value),
      });
      return p.flag ? `${line} (${t("explain.facts.flagged", { flag: str(p.flag) })})` : line;
    }
    case "change": {
      const dir = str(p.direction) as "up" | "down" | "same";
      const direction = dir === "same" ? t("explain.facts.same") : t(`explain.facts.${dir}`);
      const delta = dir === "same" ? "" : `${str(p.delta)}${p.pp ? t("explain.pp") : ""}`;
      return t("explain.facts.change", {
        place: str(p.place),
        fromValue: str(p.fromValue),
        fromYear: str(p.fromYear),
        toValue: str(p.toValue),
        toYear: str(p.toYear),
        direction,
        delta,
      });
    }
    case "rank":
      return t("explain.facts.rank", { order: str(p.order) });
    case "event":
      return t("explain.facts.event", {
        date: str(p.date),
        place: str(p.place),
        title: str(p.title),
        category: t(`event.categories.${str(p.category)}` as "event.categories.statute"),
      });
    case "quality":
      return t("explain.facts.quality", {
        place: str(p.place),
        note: t(`explain.notes.${str(p.note)}` as "explain.notes.gap"),
        years: str(p.years),
      });
    case "caution":
      return t("explain.facts.caution", {
        note: t(`explain.notes.${str(p.note)}` as "explain.notes.gap"),
        places: str(p.places),
        years: str(p.years),
      });
    case "coded":
      return t("explain.facts.coded", {
        place: str(p.place),
        rubric: str(p.rubric),
        value: str(p.value),
        label: str(p.label),
        confidence: t(`coded.confidence.${str(p.confidence)}` as "coded.confidence.high"),
        status: t(
          p.status === "checked by a second reader"
            ? "explain.status.settled"
            : "explain.status.awaiting",
        ),
        reading: str(p.reading),
      });
    case "gap":
      return t("explain.facts.gap", {
        place: str(p.place),
        year: str(p.year),
        xName: str(p.xName),
        x: str(p.x),
        yName: str(p.yName),
        y: str(p.y),
        difference: p.gap
          ? t("explain.facts.difference", {
              gap: `${str(p.gap)}${p.pp ? t("explain.pp") : ""}`,
            })
          : "",
      });
    case "statement":
      return str(p.text);
    case "empty":
      return t("explain.facts.empty", {
        layer: t(`explain.layers.${str(p.layerKey)}` as "explain.layers.de_jure"),
        wanted: str(p.wanted),
      });
  }
}

/**
 * Helps a reader interpret a page: the figures as plain-worded facts (no AI,
 * each with an anchor the explanation cites), and a button that asks an AI for
 * an explanation drawn from those facts only and checked against them.
 */
export default function ExplainPanel({
  facts,
  subject,
  locale,
  t,
}: {
  facts: BriefFact[];
  subject: Record<string, unknown>;
  locale: string;
  t: StatisticsTranslator;
}) {
  return (
    <section className="space-y-4 rounded-surface border border-default bg-surface-base p-5">
      <h2 className="text-xl font-semibold text-fg-primary">{t("explain.title")}</h2>
      <p className="mb-0 text-sm text-fg-secondary">{t("explain.intro")}</p>
      <ExplainButton
        subject={subject}
        locale={locale}
        texts={{
          ask: t("explain.ask"),
          asking: t("explain.asking"),
          again: t("explain.again"),
          questionLabel: t("explain.questionLabel"),
          questionPlaceholder: t("explain.questionPlaceholder"),
          aiLabel: t("explain.aiLabel"),
          cited: t("explain.cited"),
          rateLimited: t("explain.rateLimited"),
          unavailable: t("explain.unavailable"),
          failed: t("explain.failed"),
        }}
      />
      <div className="space-y-2">
        <h3 className="font-medium text-fg-primary">{t("explain.factsTitle")}</h3>
        <ol className="space-y-2 text-sm text-fg-secondary">
          {facts.map((f) => (
            <li key={f.id} id={`fact-${f.id}`} className="scroll-mt-24 wrap-anywhere">
              <span className="mr-2 text-fg-tertiary">{f.id}</span>
              {f.href?.startsWith("/") ? (
                <Link href={f.href} className="underline">
                  {factLine(f, t)}
                </Link>
              ) : f.href ? (
                <a href={f.href} className="underline" rel="noopener">
                  {factLine(f, t)}
                </a>
              ) : (
                factLine(f, t)
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
