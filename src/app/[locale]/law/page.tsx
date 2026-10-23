import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPathname } from "@/i18n/navigation";
import { toLocale } from "@/i18n/routing";
import LawIndex from "@/components/law/law-index";
import { LAW_AUTHORITIES } from "@/lib/config/law";
import { db } from "@/lib/db/client";
import { searchActs } from "@/lib/law/register/coverage";

export const dynamic = "force-dynamic";

type Params = Promise<{ locale: string }>;
type SearchParams = Promise<{ q?: string; authority?: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const locale = toLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Law" });
  return { title: t("index.metaTitle"), description: t("index.metaDescription") };
}

/** Find an act by its title or its number (design: docs/design/2026-10-law-as-data.md). */
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
  const hits =
    query || known
      ? await searchActs(db, {
          authority: known || undefined,
          number: byNumber ? query : undefined,
          title: !byNumber && query ? query : undefined,
        })
      : null;
  const t = await getTranslations({ locale, namespace: "Law" });
  return (
    <LawIndex
      query={query}
      authority={known}
      searchAction={getPathname({ href: "/law", locale })}
      hits={hits}
      t={t}
    />
  );
}
