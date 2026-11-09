import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import PageLayout from "@/components/ui/page-layout";
import { localized } from "@/lib/places/place-view";
import { EVENT_CATEGORIES } from "@/lib/statistics/records";
import { eventPath } from "@/lib/statistics/present";
import type { EventRow } from "@/lib/statistics/read";
import { formatDay, type StatisticsTranslator } from "./metric-view";

interface EventsIndexProps {
  events: EventRow[];
  places: { code: string; name: string }[];
  filter: { place: string; kind: string };
  locale: Locale;
  t: StatisticsTranslator;
}

/** /statistics/events: every law event, newest decision first, filtered by place and kind. */
export default function EventsIndex({ events, places, filter, locale, t }: EventsIndexProps) {
  return (
    <PageLayout title={t("events.title")} kicker={t("kicker")} description={t("events.intro")}>
      <div className="max-w-5xl space-y-8">
        <form
          method="get"
          className="flex flex-wrap items-end gap-4 rounded-surface border border-default bg-surface-base p-5"
        >
          <label className="flex flex-col gap-1 text-sm text-fg-secondary">
            {t("events.filterPlace")}
            <select name="place" defaultValue={filter.place} className="field min-w-44">
              <option value="">{t("events.all")}</option>
              {places.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-fg-secondary">
            {t("events.filterKind")}
            <select name="kind" defaultValue={filter.kind} className="field min-w-44">
              <option value="">{t("events.all")}</option>
              {EVENT_CATEGORIES.map((k) => (
                <option key={k} value={k}>
                  {t(`event.categories.${k}`)}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="btn-secondary min-h-11">
            {t("events.apply")}
          </button>
        </form>

        {events.length === 0 ? (
          <p className="rounded-surface border border-default bg-surface-base p-6 text-fg-secondary">
            {t("events.empty")}
          </p>
        ) : (
          <ul className="divide-y divide-default rounded-surface border border-default bg-surface-base">
            {events.map((e) => (
              <li
                key={e.recordKey}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <span className="min-w-0 space-y-1">
                  <span className="block text-sm text-fg-tertiary">
                    {e.placeName} · {t(`event.categories.${e.body.category}`)} ·{" "}
                    {t("events.decided", { date: formatDay(e.body.on, locale) })}
                    {e.body.effective
                      ? ` · ${t("events.effective", { date: formatDay(e.body.effective, locale) })}`
                      : ""}
                  </span>
                  <span className="block font-medium text-fg-primary">
                    {localized(e.body.title, locale)}
                  </span>
                  <span className="block text-sm text-fg-secondary">
                    {t("events.counts", {
                      votes: e.body.votes.length,
                      actors: e.body.actors.length,
                      steps: e.body.process.length,
                    })}
                  </span>
                </span>
                <Link href={eventPath(e.body.slug)} className="btn-secondary min-h-11 shrink-0">
                  {t("metric.eventOpen")}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageLayout>
  );
}
