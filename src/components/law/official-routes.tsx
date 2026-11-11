import { getFormatter, getTranslations } from "next-intl/server";
import { localizeRoute, type OfficialRoute } from "@/lib/config/law/routes";
import type { Locale } from "@/i18n/routing";

const card = "rounded-surface border border-default bg-surface-base p-5 sm:p-6";

/**
 * How a law is officially changed from outside the legislature: each route's
 * bar (who signs, how many, in what time), what it obliges the authority to do
 * and the provision that says so, in the reader's language where the route has
 * words for it and in English where it has not. Where no route is known it
 * says so. One component for the act, the proposal form and a proposal, so the
 * route looks the same wherever it is read (design:
 * docs/design/2026-11-amending-the-law.md, "The official route").
 */
export default async function OfficialRoutes({
  routes,
  locale,
  headingId = "routes",
  heading = true,
}: {
  routes: readonly OfficialRoute[];
  locale: Locale;
  headingId?: string;
  /** False where the page around it already names the section (a place's profile). */
  heading?: boolean;
}) {
  const t = await getTranslations({ locale, namespace: "Amend.amendment" });
  const format = await getFormatter({ locale });
  return (
    <section className="space-y-4" aria-labelledby={heading ? headingId : undefined}>
      {heading && (
        <h2 id={headingId} className="headline text-2xl text-fg-primary">
          {t("routes")}
        </h2>
      )}
      {routes.length === 0 ? (
        <p className="text-fg-secondary">{t("noRoute")}</p>
      ) : (
        <ul className="space-y-4">
          {routes.map((raw) => {
            const route = localizeRoute(raw, locale);
            return (
              <li key={route.key} className={`${card} space-y-2`}>
                <h3 className="font-medium text-fg-primary">{route.name}</h3>
                <p className="text-sm text-fg-secondary">
                  {route.signatures === null
                    ? t("routeNoBar", { who: route.whoMaySign })
                    : "count" in route.signatures
                      ? t("routeBar", {
                          count: format.number(route.signatures.count),
                          who: route.whoMaySign,
                        })
                      : t("routeShare", {
                          percent: format.number(route.signatures.percent),
                          of: route.signatures.of,
                          who: route.whoMaySign,
                        })}
                  {route.window &&
                    ` ${
                      "months" in route.window
                        ? t("routeWindowMonths", { months: route.window.months })
                        : t("routeWindowDays", { days: route.window.days })
                    }`}
                </p>
                {route.alsoRequired && route.alsoRequired.length > 0 && (
                  <ul className="list-disc space-y-1 pl-5 text-sm text-fg-secondary">
                    {route.alsoRequired.map((requirement) => (
                      <li key={requirement}>{requirement}</li>
                    ))}
                  </ul>
                )}
                <p className="text-sm text-fg-secondary">{route.outcome}</p>
                {route.cannotChange && (
                  <p className="text-sm text-fg-tertiary">{route.cannotChange}</p>
                )}
                <p className="text-xs text-fg-tertiary">
                  <a href={route.source.url} className="underline" rel="noopener">
                    {t("routeSource", {
                      provision: route.source.provision,
                      title: route.source.title,
                    })}
                  </a>
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
