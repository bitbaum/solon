import { Link } from "@/i18n/navigation";
import PageLayout from "@/components/ui/page-layout";
import type { PackIndex, PlaceHit, PlaceSearch } from "@/lib/places/search";
import PlacesMap from "./places-map";
import type { PlacesTranslator } from "./place-profile";

interface PlacesIndexProps {
  query: string;
  /** Where the search form submits, in the reader's language. */
  searchAction: string;
  search: PlaceSearch | null;
  /** A level being browsed, with its places. */
  browse: { pack: string; level: string; levelName: string; places: PlaceHit[] } | null;
  packs: PackIndex[];
  /** The pack the map draws; null when none has boundaries. */
  mapPack: string | null;
  t: PlacesTranslator;
}

function HitList({ hits, t }: { hits: PlaceHit[]; t: PlacesTranslator }) {
  return (
    <ul className="divide-y divide-default rounded-surface border border-default bg-surface-base">
      {hits.map((hit) => (
        <li key={hit.slugPath} className="px-5 py-3">
          <Link
            href={`/places/${hit.slugPath}`}
            className="font-medium text-fg-primary hover:underline"
          >
            {hit.name}
          </Link>{" "}
          <span className="text-sm text-fg-tertiary">
            {hit.parentName
              ? t("index.hitIn", { level: hit.levelName, parent: hit.parentName })
              : hit.levelName}
          </span>
          {hit.localities && (
            <span className="mt-1 block text-sm text-fg-secondary">
              {hit.localities
                .map((l) =>
                  l.share === null
                    ? l.name
                    : t("index.localityShare", { locality: l.name, share: l.share }),
                )
                .join(" · ")}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * Finding a place (design §9.1, §9.2): the map first, with one box for an
 * address, a place or a postcode; below it, browsing a pack's levels. Without
 * JavaScript the plain search form stands in for the map. A postcode that
 * spans several places lists each with its share of addresses and lets the
 * reader pick; nothing is guessed.
 */
export default function PlacesIndex({
  query,
  searchAction,
  search,
  browse,
  packs,
  mapPack,
  t,
}: PlacesIndexProps) {
  const form = (
    <form action={searchAction} method="get" role="search" className="space-y-2">
      <label htmlFor="places-q" className="block text-sm font-medium text-fg-primary">
        {t("index.searchLabel")}
      </label>
      <div className="flex gap-3">
        <input
          id="places-q"
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
  );
  return (
    <PageLayout title={t("index.title")} kicker={t("index.kicker")}>
      <p className="mb-10 max-w-3xl text-fg-secondary">{t("index.intro")}</p>
      {mapPack && (
        <div className="mb-16">
          <PlacesMap packKey={mapPack} />
        </div>
      )}
      <div className="mx-auto max-w-3xl space-y-10">
        {mapPack && !search ? <noscript>{form}</noscript> : form}

        {search && (
          <section aria-live="polite" className="space-y-3">
            <h2 className="font-semibold text-fg-primary">
              {search.hits.length === 0
                ? t("index.noHits", { query })
                : search.kind === "postcode"
                  ? search.hits.length === 1
                    ? t("index.postcodeOne", { postcode: query })
                    : t("index.postcodeMany", { postcode: query, count: search.hits.length })
                  : t("index.nameHits", { count: search.hits.length })}
            </h2>
            {search.hits.length > 0 && <HitList hits={search.hits} t={t} />}
          </section>
        )}

        {browse && (
          <section className="space-y-3">
            <h2 className="font-semibold text-fg-primary">
              {t("index.levelTitle", { level: browse.levelName, count: browse.places.length })}
            </h2>
            <HitList hits={browse.places} t={t} />
          </section>
        )}

        {packs.map((pack) => (
          <section key={pack.key} className="space-y-3">
            <h2 className="font-semibold text-fg-primary">{pack.name}</h2>
            <ul className="flex flex-wrap gap-2 text-sm">
              {pack.levels
                .filter((level) => level.count > 0)
                .map((level) => (
                  <li key={level.key}>
                    <Link
                      href={`/places?pack=${pack.key}&level=${level.key}`}
                      className="inline-block rounded-pill border border-default px-3 py-1 text-fg-primary hover:bg-surface-raised"
                    >
                      {t("index.levelLink", { level: level.name, count: level.count })}
                    </Link>
                  </li>
                ))}
            </ul>
          </section>
        ))}

        <p className="text-sm text-fg-secondary">
          <Link href="/places/coverage" className="text-fg-primary hover:underline">
            {t("index.coverageLink")}
          </Link>
        </p>
      </div>
    </PageLayout>
  );
}
