import { getFormatter } from "next-intl/server";
import OfficialRoutes from "@/components/law/official-routes";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { routesOfAuthority } from "@/lib/config/law/routes";
import type { PlaceLaw } from "@/lib/law/place-law";
import type { RecentChange } from "@/lib/law/recent";
import type { PlacesTranslator } from "./translator";

/**
 * How the law that applies to a place is changed by the people it applies
 * to, for each authority from the nearest up that has an official route (a
 * commune's initiative, a canton's, the country's), and what changed in that
 * law over the past year. Each part shows only where Solon holds it.
 */
/** The authorities from the place up that have an official route, each with its routes. */
export const routesAlong = (law: readonly PlaceLaw[]) =>
  law
    .map((a) => ({ authority: a, routes: routesOfAuthority(a.key) }))
    .filter((a) => a.routes.length > 0);

export async function PlaceRoutes({
  law,
  locale,
  t,
}: {
  law: readonly PlaceLaw[];
  locale: Locale;
  t: PlacesTranslator;
}) {
  const withRoutes = routesAlong(law);
  if (withRoutes.length === 0) return null;
  return (
    <section aria-labelledby="place-routes" className="space-y-6">
      <div>
        <h2 id="place-routes" className="headline text-2xl text-fg-primary">
          {t("change.title")}
        </h2>
        <p className="mb-0 mt-2 text-sm text-fg-secondary">{t("change.intro")}</p>
      </div>
      {withRoutes.map(({ authority, routes }) => (
        <div key={authority.key} className="space-y-3">
          {withRoutes.length > 1 && (
            <h3 className="text-sm font-semibold text-fg-secondary">{authority.name}</h3>
          )}
          <OfficialRoutes routes={routes} locale={locale} heading={false} />
        </div>
      ))}
    </section>
  );
}

export async function PlaceRecentChanges({
  recent,
  law,
  place,
  locale,
  t,
}: {
  recent: { total: number; changes: readonly RecentChange[] };
  law: readonly PlaceLaw[];
  place: string;
  locale: Locale;
  t: PlacesTranslator;
}) {
  if (recent.changes.length === 0) return null;
  const format = await getFormatter({ locale });
  const names = new Map(law.map((a) => [a.key, a.name]));
  const date = (iso: string) =>
    format.dateTime(new Date(`${iso}T00:00:00Z`), { dateStyle: "medium", timeZone: "UTC" });
  return (
    <section aria-labelledby="place-recent" className="space-y-4">
      <div>
        <h2 id="place-recent" className="headline text-2xl text-fg-primary">
          {t("recent.title")}
        </h2>
        <p className="mb-0 mt-2 text-sm text-fg-secondary">
          {t("recent.intro", { place, count: recent.total })}
        </p>
      </div>
      <ul className="divide-y divide-default overflow-hidden rounded-surface border border-default bg-surface-base">
        {recent.changes.map((c) => (
          <li key={c.actId}>
            <Link
              href={`/law/${c.actId}`}
              className="flex min-h-11 flex-col gap-1 px-5 py-3 hover:bg-surface-raised sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
            >
              <span className="min-w-0">
                <span className="block font-medium text-fg-primary [overflow-wrap:anywhere]">
                  {c.title}
                </span>
                {law.length > 1 && (
                  <span className="block text-xs text-fg-tertiary">
                    {names.get(c.authority) ?? c.authority}
                  </span>
                )}
              </span>
              <span className="shrink-0 text-sm text-fg-tertiary">
                {t(c.amended ? "recent.amended" : "recent.new", { date: date(c.inForceFrom) })}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
