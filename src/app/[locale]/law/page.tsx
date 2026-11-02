import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPathname } from "@/i18n/navigation";
import { toLocale } from "@/i18n/routing";
import LawIndex from "@/components/law/law-index";
import { LAW_AUTHORITIES } from "@/lib/config/law";
import { db } from "@/lib/db/client";
import { placeTree } from "@/lib/law/places";
import { loadLawCoverage, searchActs } from "@/lib/law/register/coverage";
import { findLaw } from "@/lib/law/find";

export const dynamic = "force-dynamic";

type Params = Promise<{ locale: string }>;
type SearchParams = Promise<{ q?: string; authority?: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const locale = toLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Law" });
  return { title: t("index.metaTitle"), description: t("index.metaDescription") };
}

/** Find the law: by a word of its title, a word of its text, its number, or the place it applies (design: docs/design/2026-11-law-navigation.md). */
export default async function LawPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const locale = toLocale((await params).locale);
  setRequestLocale(locale);
  const { q = "", authority = "" } = await searchParams;
  const query = q.trim().slice(0, 100);
  const known = LAW_AUTHORITIES.some((a) => a.key === authority) ? authority : "";
  const byNumber = /^\d[\d.]*$/.test(query);
  const searched = Boolean(query || known);
  // A number is looked up exactly; words go through searchkit, typos forgiven.
  const found =
    query && !byNumber ? await findLaw(db, { query, authority: known || undefined }) : null;
  const [hits, coverage] = await Promise.all([
    !searched
      ? null
      : found
        ? found.acts
        : searchActs(
            db,
            {
              authority: known || undefined,
              number: byNumber ? query : undefined,
              inForceOnly: true,
            },
            20,
          ),
    loadLawCoverage(db),
  ]);
  const textHits = found?.provisions ?? [];
  const t = await getTranslations({ locale, namespace: "Law" });
  return (
    <LawIndex
      query={query}
      authority={known}
      searchAction={getPathname({ href: "/law", locale })}
      hits={hits}
      textHits={textHits}
      suggestion={found?.suggestion ?? null}
      places={placeTree(coverage.authorities)}
      t={t}
    />
  );
}
