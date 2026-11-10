import { Link } from "@/i18n/navigation";
import PageLayout from "@/components/ui/page-layout";
import { PLACE_ACTS_PER_PAGE, chainOf } from "@/lib/law/places";
import type { ActSearchHit } from "@/lib/law/register/coverage";
import ActRow from "./act-row";
import type { LawTranslator } from "./coverage-report";
import PlaceTrail from "./place-trail";
import { authorityName, readerAuthorityNames } from "@/lib/law/authority-names";

interface PlacePageProps {
  authority: string;
  title: string;
  page: number;
  total: number;
  acts: ActSearchHit[];
  action: string;
  t: LawTranslator;
}

/** Every law of one place, filterable by a word of its title, with the places above it whose law applies here too. */
export default async function PlacePage({
  authority,
  title,
  page,
  total,
  acts,
  action,
  t,
}: PlacePageProps) {
  const names = await readerAuthorityNames();
  const name = authorityName(names, authority);
  const above = chainOf(authority).slice(1);
  const pages = Math.max(1, Math.ceil(total / PLACE_ACTS_PER_PAGE));
  const href = (n: number) =>
    `/law/place/${authority}?${new URLSearchParams({ ...(title ? { q: title } : {}), page: String(n) })}`;
  return (
    <PageLayout title={t("place.title", { place: name })} kicker={t("index.kicker")}>
      <div className="max-w-3xl space-y-8">
        <PlaceTrail authority={authority} t={t} />

        {above.length > 0 && (
          <p className="text-fg-secondary">
            {t("place.alsoApplies")}{" "}
            {above.map((a, i) => (
              <span key={a.key}>
                {i > 0 && " · "}
                <Link
                  href={`/law/place/${a.key}`}
                  className="font-medium text-fg-primary underline"
                >
                  {authorityName(names, a.key)}
                </Link>
              </span>
            ))}
          </p>
        )}

        <form action={action} method="get" role="search" className="space-y-3">
          <label htmlFor="place-q" className="block font-medium text-fg-primary">
            {t("place.filterLabel")}
          </label>
          <input
            id="place-q"
            name="q"
            type="search"
            defaultValue={title}
            placeholder={t("place.filterPlaceholder")}
            className="field"
            autoComplete="off"
          />
          <button type="submit" className="btn-primary min-h-11">
            {t("index.searchButton")}
          </button>
        </form>

        <section className="space-y-3" aria-live="polite">
          <h2 className="font-semibold text-fg-primary">
            {total === 0 ? t("place.empty") : t("index.hits", { count: total })}
          </h2>
          {acts.length > 0 && (
            <ul className="divide-y divide-default rounded-surface border border-default bg-surface-base">
              {acts.map((hit) => (
                <ActRow key={hit.id} hit={hit} t={t} />
              ))}
            </ul>
          )}
          {pages > 1 && (
            <nav className="flex items-center justify-between text-sm" aria-label={t("act.pages")}>
              {page > 1 ? (
                <Link href={href(page - 1)} className="underline">
                  {t("act.previous")}
                </Link>
              ) : (
                <span />
              )}
              <span className="text-fg-tertiary">{t("act.pageOf", { page, pages })}</span>
              {page < pages ? (
                <Link href={href(page + 1)} className="underline">
                  {t("act.next")}
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </section>

        <p className="text-sm">
          <Link href="/law" className="text-fg-secondary underline">
            {t("act.back")}
          </Link>
        </p>
      </div>
    </PageLayout>
  );
}
