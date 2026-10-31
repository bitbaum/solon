import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { toLocale } from "@/i18n/routing";
import ActViewPage from "@/components/law/act-view";
import { db } from "@/lib/db/client";
import { loadActView, pageOfProvision } from "@/lib/law/view";

export const dynamic = "force-dynamic";

type Params = Promise<{ locale: string; id: string }>;
type SearchParams = Promise<{ page?: string; at?: string }>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export async function generateMetadata({ params }: { params: Params }) {
  const { locale: raw, id } = await params;
  const locale = toLocale(raw);
  const t = await getTranslations({ locale, namespace: "Law" });
  if (!UUID.test(id)) return { title: t("act.kicker") };
  const act = await loadActView(db, { id, lang: "de", page: 1 });
  return { title: act?.title ?? t("act.kicker") };
}

/** One act: its links, and the provisions of the version in force (design: docs/design/2026-10-law-as-data.md). */
export default async function ActPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { locale: raw, id } = await params;
  const locale = toLocale(raw);
  setRequestLocale(locale);
  if (!UUID.test(id)) notFound();
  const query = await searchParams;
  // `?at=art_64` opens the page that holds that provision; its anchor scrolls to it.
  const at = query.at && /^[A-Za-z0-9_.-]{1,80}$/.test(query.at) ? query.at : null;
  const page =
    (at && (await pageOfProvision(db, { id, lang: "de", path: at }))) ||
    Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
  // Every text is held in German so far; a version in the reader's own language is read when there is one.
  const act = await loadActView(db, { id, lang: "de", page });
  if (!act) notFound();
  const t = await getTranslations({ locale, namespace: "Law" });
  return <ActViewPage act={act} page={page} t={t} />;
}
