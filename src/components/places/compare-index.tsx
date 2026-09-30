import { Link } from "@/i18n/navigation";
import PageLayout from "@/components/ui/page-layout";
import { compareHref, type Comparison } from "@/lib/places/compare-view";
import type { PlaceSearch } from "@/lib/places/search";
import PlaceComparison from "./place-comparison";
import type { PlacesTranslator } from "./place-profile";
import SourceList from "./source-list";

interface CompareIndexProps {
  /** The compared places' paths, in the link's order. */
  slugPaths: string[];
  comparison: Comparison;
  limit: number;
  query: string;
  /** Where the add-a-place search submits, in the reader's language. */
  searchAction: string;
  search: PlaceSearch | null;
  t: PlacesTranslator;
}

/**
 * /compare (design §9.2): the places in the link side by side, and a search to
 * add another. Which places are compared lives in the link, so a comparison
 * can be shared; what the reader types for the estimate never does.
 */
export default function CompareIndex({
  slugPaths,
  comparison,
  limit,
  query,
  searchAction,
  search,
  t,
}: CompareIndexProps) {
  const compared = comparison.columns.map((c) => c.slugPath);
  const full = compared.length >= limit;
  return (
    <PageLayout title={t("compare.title")} kicker={t("compare.kicker")}>
      <div className="mx-auto max-w-5xl space-y-10">
        <p className="max-w-3xl text-fg-secondary">{t("compare.intro", { limit })}</p>

        {comparison.notFound.length > 0 && (
          <p className="rounded-surface border border-default bg-surface-raised p-4 text-sm text-fg-secondary">
            {t("compare.notFound", { count: comparison.notFound.length })}
          </p>
        )}

        {compared.length > 0 ? (
          <PlaceComparison comparison={comparison} />
        ) : (
          <p className="rounded-surface border border-default bg-surface-base p-6 text-fg-secondary">
            {t("compare.empty")}
          </p>
        )}

        <section className="max-w-3xl space-y-3">
          {full ? (
            <p className="text-sm text-fg-secondary">{t("compare.full", { limit })}</p>
          ) : (
            <form action={searchAction} method="get" role="search" className="space-y-2">
              <label htmlFor="compare-q" className="block font-semibold text-fg-primary">
                {compared.length === 0 ? t("compare.addFirst") : t("compare.addAnother")}
              </label>
              {slugPaths.map((path) => (
                <input key={path} type="hidden" name="p" value={path} />
              ))}
              <div className="flex gap-3">
                <input
                  id="compare-q"
                  name="q"
                  defaultValue={query}
                  placeholder={t("index.searchPlaceholder")}
                  className="field"
                  autoComplete="off"
                />
                <button type="submit" className="btn-primary min-h-11 shrink-0">
                  {t("index.searchButton")}
                </button>
              </div>
            </form>
          )}

          {search && !full && (
            <div aria-live="polite" className="space-y-3">
              {search.hits.length === 0 ? (
                <p className="text-sm text-fg-secondary">{t("index.noHits", { query })}</p>
              ) : (
                <ul className="divide-y divide-default rounded-surface border border-default bg-surface-base">
                  {search.hits.map((hit) => {
                    const added = compared.includes(hit.slugPath);
                    return (
                      <li
                        key={hit.slugPath}
                        className="flex items-center justify-between gap-4 px-5 py-3"
                      >
                        <span className="min-w-0">
                          <span className="font-medium text-fg-primary">{hit.name}</span>{" "}
                          <span className="text-sm text-fg-tertiary">
                            {hit.parentName
                              ? t("index.hitIn", { level: hit.levelName, parent: hit.parentName })
                              : hit.levelName}
                          </span>
                        </span>
                        {added ? (
                          <span className="shrink-0 text-sm text-fg-tertiary">
                            {t("compare.added")}
                          </span>
                        ) : (
                          <Link
                            href={compareHref([...compared, hit.slugPath])}
                            prefetch={false}
                            className="btn-secondary min-h-11 shrink-0"
                            aria-label={t("compare.addNamed", { place: hit.name })}
                          >
                            {t("compare.add")}
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </section>

        <SourceList sources={comparison.sources} t={t} />
      </div>
    </PageLayout>
  );
}
