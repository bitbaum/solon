import { Link } from "@/i18n/navigation";
import { DEFAULT_CATEGORY, proposeHref } from "@/lib/domain/proposal-draft";
import { localized } from "@/lib/places/place-view";
import type { MetricViewProps } from "./metric-view";

/**
 * How the law behind a series is enforced, as named sources state it: kept
 * beside the statute, never in it, each statement with who makes it and the
 * page it was read on. With none recorded, the way to add one.
 */
export default function EnforcementList({
  enforcement,
  locale,
  selfUrl,
  label,
  t,
}: MetricViewProps & { label: string }) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold text-fg-primary">{t("metric.enforcementTitle")}</h2>
      {enforcement.length === 0 ? (
        <p className="text-fg-secondary">{t("metric.enforcementNone")}</p>
      ) : (
        <ul className="space-y-3">
          {enforcement.map(({ body, placeName }) => (
            <li
              key={`${body.place.value}-${body.act.value}-${body.from}`}
              className="space-y-1 rounded-surface border border-default bg-surface-base p-5"
            >
              <p className="mb-0 text-sm text-fg-tertiary">{placeName}</p>
              <p className="mb-0 text-fg-primary">{localized(body.summary, locale)}</p>
              <p className="mb-0 text-xs text-fg-tertiary">
                {body.to
                  ? t("metric.statedBy", { source: body.statedBy, from: body.from, to: body.to })
                  : t("metric.statedSince", { source: body.statedBy, from: body.from })}{" "}
                {body.evidence.map((e) => (
                  <a key={e.url} href={e.url} className="underline" rel="noopener">
                    {e.publisher}
                  </a>
                ))}
              </p>
            </li>
          ))}
        </ul>
      )}
      <Link
        href={proposeHref({
          category: DEFAULT_CATEGORY,
          title: t("metric.enforcementSuggestTitle", { metric: label }),
          body: t("metric.enforcementSuggestBody", { url: selfUrl }),
        })}
        className="btn-secondary min-h-11"
      >
        {t("metric.enforcementSuggest")}
      </Link>
    </section>
  );
}
