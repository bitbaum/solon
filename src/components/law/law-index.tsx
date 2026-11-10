import { Link } from "@/i18n/navigation";
import PageLayout from "@/components/ui/page-layout";
import type { Range } from "@bitbaum/searchkit";
import type { ProvisionHit } from "@/lib/law/search";
import { authorityOf, type PlaceNode } from "@/lib/law/places";
import type { ActSearchHit } from "@/lib/law/register/coverage";
import ActRow from "./act-row";
import type { LawTranslator } from "./coverage-report";
import Excerpt from "./excerpt";

interface LawIndexProps {
  query: string;
  authority: string;
  /** Where the search form submits, in the reader's language. */
  searchAction: string;
  /** Acts whose title matches; null before anything is searched. */
  hits: (ActSearchHit & { marks?: Range[] })[] | null;
  /** Provisions whose text matches. */
  textHits: ProvisionHit[];
  /** What was probably meant, when nothing matched. */
  suggestion: string | null;
  places: PlaceNode[];
  t: LawTranslator;
}

const listClass = "divide-y divide-default rounded-surface border border-default bg-surface-base";

function PlaceLink({ node, t }: { node: PlaceNode; t: LawTranslator }) {
  return (
    <Link
      href={`/law/place/${node.key}`}
      className="flex min-h-11 items-center justify-between gap-4 px-5 py-2 hover:bg-surface-raised"
    >
      <span className="font-medium text-fg-primary">{node.name}</span>
      <span className="shrink-0 text-sm tabular-nums text-fg-tertiary">
        {t("index.placeActs", { count: node.inForce + node.statusNotStated })}
      </span>
    </Link>
  );
}

/**
 * Finding the law. One search box over titles and over the text of every act,
 * and below it the places, so someone who does not know a word of the law can
 * still start from where they live: the Confederation, their canton, their commune.
 */
export default function LawIndex({
  query,
  authority,
  searchAction,
  hits,
  textHits,
  suggestion,
  places,
  t,
}: LawIndexProps) {
  const searched = hits !== null;
  const nothing = searched && hits.length === 0 && textHits.length === 0;
  const where = authority ? authorityOf(authority)?.name : null;
  return (
    <PageLayout title={t("index.title")} kicker={t("index.kicker")}>
      <div className="max-w-3xl space-y-10">
        <p className="text-fg-secondary">{t("index.intro")}</p>

        <form action={searchAction} method="get" role="search" className="space-y-3">
          <label htmlFor="law-q" className="block font-medium text-fg-primary">
            {t("index.searchLabel")}
          </label>
          <input
            id="law-q"
            name="q"
            type="search"
            defaultValue={query}
            placeholder={t("index.searchPlaceholder")}
            className="field"
            autoComplete="off"
          />
          {authority && <input type="hidden" name="authority" value={authority} />}
          <button type="submit" className="btn-primary min-h-11">
            {t("index.searchButton")}
          </button>
          {where && (
            <p className="text-sm text-fg-secondary">
              {t("index.onlyIn", { place: where })}{" "}
              <Link
                href={query ? `/law?q=${encodeURIComponent(query)}` : "/law"}
                className="underline"
              >
                {t("index.anyAuthority")}
              </Link>
            </p>
          )}
        </form>

        {!searched && (
          <p className="text-sm text-fg-secondary">
            {t("index.examplesTitle")}{" "}
            {(["one", "two", "three"] as const).map((key, i) => (
              <span key={key}>
                {i > 0 && " · "}
                <Link
                  href={`/law?q=${encodeURIComponent(t(`index.examples.${key}`))}`}
                  className="underline"
                >
                  {t(`index.examples.${key}`)}
                </Link>
              </span>
            ))}
          </p>
        )}

        {searched && (
          <div aria-live="polite" className="space-y-8">
            {nothing && (
              <div className="space-y-2">
                <h2 className="font-semibold text-fg-primary">{t("index.noHits")}</h2>
                {suggestion && (
                  <p className="text-fg-secondary">
                    {t("index.didYouMean")}{" "}
                    <Link
                      href={`/law?q=${encodeURIComponent(suggestion)}${authority ? `&authority=${authority}` : ""}`}
                      className="font-medium text-fg-primary underline"
                    >
                      {suggestion}
                    </Link>
                  </p>
                )}
                <p className="text-fg-secondary">
                  <Link href="/law/ask" className="underline">
                    {t("index.askLink")}
                  </Link>
                </p>
              </div>
            )}
            {hits.length > 0 && (
              <section className="space-y-3">
                <h2 className="font-semibold text-fg-primary">
                  {t("index.titleHits", { count: hits.length })}
                </h2>
                <ul className={listClass}>
                  {hits.map((hit) => (
                    <ActRow key={hit.id} hit={hit} t={t} />
                  ))}
                </ul>
              </section>
            )}
            {textHits.length > 0 && (
              <section className="space-y-3">
                <h2 className="font-semibold text-fg-primary">{t("index.textHits")}</h2>
                <ul className={listClass}>
                  {textHits.map((hit) => (
                    <li key={`${hit.actId}#${hit.path}`} className="px-5 py-3">
                      <Link
                        href={`/law/${hit.actId}?at=${encodeURIComponent(hit.path)}`}
                        className="font-medium text-fg-primary hover:underline"
                      >
                        {hit.title ?? hit.systematicNumber ?? hit.actId}
                        {hit.heading ? ` · ${hit.heading}` : ""}
                      </Link>
                      <span className="mt-1 block text-sm text-fg-secondary">
                        <Excerpt text={hit.excerpt} />
                      </span>
                      <span className="mt-1 block text-sm text-fg-tertiary">
                        {[authorityOf(hit.authority)?.name ?? hit.authority, hit.systematicNumber]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}

        <section className="space-y-4" aria-labelledby="law-browse">
          <div className="space-y-1">
            <h2 id="law-browse" className="font-semibold text-fg-primary">
              {t("index.browseTitle")}
            </h2>
            <p className="text-sm text-fg-secondary">{t("index.browseHint")}</p>
          </div>
          {places.map((country) => (
            <div key={country.key} className="space-y-3">
              <ul className={listClass}>
                <li>
                  <PlaceLink node={country} t={t} />
                </li>
                {country.children.map((region) => (
                  <li key={region.key}>
                    {region.children.length === 0 ? (
                      <PlaceLink node={region} t={t} />
                    ) : (
                      <details>
                        <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-4 px-5 py-2 hover:bg-surface-raised">
                          <span className="font-medium text-fg-primary">{region.name}</span>
                          <span className="shrink-0 text-sm text-fg-tertiary">
                            {t("index.communes", { count: region.children.length })}
                          </span>
                        </summary>
                        <ul className="divide-y divide-default border-t border-default">
                          <li>
                            <PlaceLink node={region} t={t} />
                          </li>
                          {region.children.map((commune) => (
                            <li key={commune.key} className="pl-4">
                              <PlaceLink node={commune} t={t} />
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <p className="space-x-4 text-sm">
          <Link href="/law/ask" className="font-medium text-fg-primary underline">
            {t("index.askLink")}
          </Link>
          <Link href="/law/coverage" className="text-fg-secondary underline">
            {t("index.coverageLink")}
          </Link>
        </p>
      </div>
    </PageLayout>
  );
}
