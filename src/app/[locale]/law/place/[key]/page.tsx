import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPathname } from "@/i18n/navigation";
import { toLocale } from "@/i18n/routing";
import PlacePage from "@/components/law/place-page";
import { db } from "@/lib/db/client";
import { authorityName, loadAuthorityNames } from "@/lib/law/authority-names";
import { authorityOf, listPlaceActs } from "@/lib/law/places";

export const dynamic = "force-dynamic";

type Params = Promise<{ locale: string; key: string }>;
type SearchParams = Promise<{ q?: string; page?: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { locale: raw, key } = await params;
  const authority = authorityOf(key);
  if (!authority) return {};
  const t = await getTranslations({ locale: toLocale(raw), namespace: "Law.place" });
  const place = authorityName(await loadAuthorityNames(raw), key);
  return {
    title: t("metaTitle", { place }),
    description: t("metaDescription", { place }),
  };
}

/** All the laws of one place, and the places above it whose law applies there too. */
export default async function LawPlacePage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { locale: raw, key } = await params;
  const locale = toLocale(raw);
  setRequestLocale(locale);
  const authority = authorityOf(key);
  if (!authority) notFound();
  const query = await searchParams;
  const title = (query.q ?? "").trim().slice(0, 100);
  const page = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
  const { total, acts } = await listPlaceActs(db, { authority: key, title, page });
  const t = await getTranslations({ locale, namespace: "Law" });
  return (
    <PlacePage
      authority={key}
      title={title}
      page={page}
      total={total}
      acts={acts}
      action={getPathname({ href: `/law/place/${key}`, locale })}
      t={t}
    />
  );
}
