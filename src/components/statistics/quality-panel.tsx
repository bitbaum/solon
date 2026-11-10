import { assessSeries, type QualityNote } from "@/lib/statistics/quality";
import type { PlaceSeries } from "@/lib/statistics/read";
import type { StatisticsTranslator } from "./shared";

const years = (list: number[]) =>
  list.length > 6 ? `${list.slice(0, 5).join(", ")} … ${list.at(-1)}` : list.join(", ");

function line(note: QualityNote, t: StatisticsTranslator): string {
  switch (note.kind) {
    case "gap":
      return t("quality.gap", { years: years(note.years) });
    case "jump":
      return t("quality.jump", { years: years(note.years) });
    case "stale":
      return t("quality.stale", { year: note.years[0]!, count: note.detail.yearsOld! });
    case "provisional":
      return t("quality.provisional", { years: years(note.years) });
    case "short":
      return t("quality.short", { count: note.detail.points! });
  }
}

/**
 * Is each series fit to be read: what it covers and anything irregular in it,
 * computed from the figures themselves. It flags and never discards; a flagged
 * figure is still shown, with its flag, for a person to confirm.
 */
export default function QualityPanel({
  shown,
  t,
}: {
  shown: PlaceSeries[];
  t: StatisticsTranslator;
}) {
  const thisYear = new Date().getUTCFullYear();
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold text-fg-primary">{t("quality.title")}</h2>
      <ul className="space-y-2 text-sm">
        {shown.map((s) => {
          const q = assessSeries(s, thisYear);
          return (
            <li key={s.code} className="text-fg-secondary">
              <span className="font-medium text-fg-primary">{s.name}</span>:{" "}
              {t("quality.range", { count: q.count, from: q.from, to: q.to })}{" "}
              {q.notes.length === 0 ? t("quality.none") : q.notes.map((n) => line(n, t)).join(" ")}
            </li>
          );
        })}
      </ul>
      <p className="mb-0 text-xs text-fg-tertiary">{t("quality.how")}</p>
    </section>
  );
}
