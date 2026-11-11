import { Link } from "@/i18n/navigation";
import { cite } from "@/lib/i18n/config-catalog";
import { localized } from "@/lib/places/place-view";
import type { MetricViewProps } from "./shared";

/**
 * The law a series is about: each linked act and article with why, where the
 * link was checked, the text itself, and a way to propose a change to it. An
 * act the register does not hold yet links to its publisher, never nowhere.
 */
export default function LawLinks({
  acts,
  locale,
  placeNames,
  t,
}: MetricViewProps & { label: string }) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold text-fg-primary">{t("metric.lawTitle")}</h2>
      {acts.length === 0 ? (
        <p className="text-fg-secondary">{t("metric.noLaw")}</p>
      ) : (
        <ul className="space-y-4">
          {acts.map((a) => {
            const name = a.title ?? `${a.link.act.authority.toUpperCase()} ${a.link.act.value}`;
            const at = a.link.provision;
            const article = at ? at.replace(/^art_/, "Art. ").replace(/^para/, "§ ") : null;
            return (
              <li
                key={a.recordKey}
                className="space-y-2 rounded-surface border border-default bg-surface-base p-5"
              >
                <p className="mb-0 text-sm text-fg-tertiary">
                  {a.jurisdictionId
                    ? t("metric.lawFor", { place: placeNames.get(a.jurisdictionId) ?? "" })
                    : t("metric.lawEverywhere")}
                </p>
                <p className="mb-0 font-semibold text-fg-primary">
                  {article
                    ? t("metric.lawArticle", { act: name, article })
                    : t("metric.lawWhole", { act: name })}
                </p>
                <p className="mb-0 text-fg-secondary">{localized(a.link.why, locale)}</p>
                <p className="mb-0 text-xs text-fg-tertiary">
                  {a.link.evidence.map((e) => (
                    <span key={e.url} className="block">
                      {t("metric.checked", { date: e.read, publisher: cite(e.publisher, locale) })}
                    </span>
                  ))}
                </p>
                <div className="flex flex-wrap gap-3 pt-1">
                  {a.actId ? (
                    <>
                      <Link
                        href={
                          at
                            ? `/law/${a.actId}?at=${encodeURIComponent(at)}#${at}`
                            : `/law/${a.actId}`
                        }
                        className="btn-secondary min-h-11"
                      >
                        {t("metric.readArticle")}
                      </Link>
                      <Link
                        href={
                          at
                            ? `/law/${a.actId}/amend?at=${encodeURIComponent(at)}`
                            : `/law/${a.actId}/amend`
                        }
                        className="btn-secondary min-h-11"
                      >
                        {t("metric.proposeChange")}
                      </Link>
                    </>
                  ) : (
                    <span className="text-sm text-fg-secondary">
                      {t("metric.notHeld")}{" "}
                      <a href={a.link.evidence[0]!.url} className="underline" rel="noopener">
                        {cite(a.link.evidence[0]!.publisher, locale)}
                      </a>
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
