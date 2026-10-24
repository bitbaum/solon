import { Link } from "@/i18n/navigation";
import PageLayout from "@/components/ui/page-layout";
import { LAW_AUTHORITIES, type ActKind } from "@/lib/config/law";
import type { ActSearchHit } from "@/lib/law/register/coverage";
import type { LawTranslator } from "./coverage-report";

interface LawIndexProps {
  query: string;
  authority: string;
  /** Where the search form submits, in the reader's language. */
  searchAction: string;
  hits: ActSearchHit[] | null;
  t: LawTranslator;
}

const authorityName = (key: string): string =>
  LAW_AUTHORITIES.find((a) => a.key === key)?.name ?? key;

/**
 * Finding an act: its title, or its number in the collection that numbers it.
 * Names and numbers come from the register; the text of an act is on its own page.
 */
export default function LawIndex({ query, authority, searchAction, hits, t }: LawIndexProps) {
  return (
    <PageLayout title={t("index.title")} kicker={t("index.kicker")}>
      <div className="mx-auto max-w-3xl space-y-10">
        <p className="text-fg-secondary">{t("index.intro")}</p>
        <p>
          <Link href="/law/ask" className="font-medium text-fg-primary underline">
            {t("index.askLink")}
          </Link>
        </p>
        <form action={searchAction} method="get" role="search" className="space-y-4">
          <div>
            <label htmlFor="law-q" className="block text-sm font-medium text-fg-primary">
              {t("index.searchLabel")}
            </label>
            <input
              id="law-q"
              name="q"
              defaultValue={query}
              placeholder={t("index.searchPlaceholder")}
              className="field mt-2"
              autoComplete="off"
            />
          </div>
          <div>
            <label htmlFor="law-authority" className="block text-sm font-medium text-fg-primary">
              {t("index.authorityLabel")}
            </label>
            <select
              id="law-authority"
              name="authority"
              defaultValue={authority}
              className="field mt-2"
            >
              <option value="">{t("index.anyAuthority")}</option>
              {LAW_AUTHORITIES.map((a) => (
                <option key={a.key} value={a.key}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn-primary min-h-11">
            {t("index.searchButton")}
          </button>
        </form>

        {hits && (
          <section aria-live="polite" className="space-y-3">
            <h2 className="font-semibold text-fg-primary">
              {hits.length === 0 ? t("index.noHits") : t("index.hits", { count: hits.length })}
            </h2>
            {hits.length > 0 && (
              <ul className="divide-y divide-default rounded-surface border border-default bg-surface-base">
                {hits.map((hit) => (
                  <li key={hit.id} className="px-5 py-3">
                    <Link
                      href={`/law/${hit.id}`}
                      className="font-medium text-fg-primary hover:underline"
                    >
                      {hit.title ?? hit.systematicNumber ?? hit.id}
                    </Link>
                    <span className="mt-1 block text-sm text-fg-tertiary">
                      {[
                        authorityName(hit.authority),
                        hit.systematicNumber,
                        t(`kinds.${hit.kind}` as `kinds.${ActKind}`),
                        hit.inForce ? null : t("index.notInForce"),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
        <p className="text-sm">
          <Link href="/law/coverage" className="text-fg-secondary underline">
            {t("index.coverageLink")}
          </Link>
        </p>
      </div>
    </PageLayout>
  );
}
