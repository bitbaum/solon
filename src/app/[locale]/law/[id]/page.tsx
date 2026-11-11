import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { toLocale } from "@/i18n/routing";
import ActViewPage from "@/components/law/act-view";
import { db } from "@/lib/db/client";
import { listAmendments } from "@/lib/law/amend/store";
import { actTranslation } from "@/lib/law/act-translation";
import { cachedTranslations, textHash } from "@/lib/law/translate";
import { loadActContents, loadActView, pageOfProvision } from "@/lib/law/view";

export const dynamic = "force-dynamic";

type Params = Promise<{ locale: string; id: string }>;
type SearchParams = Promise<{ page?: string; at?: string; original?: string }>;

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
    (at && (await pageOfProvision(db, { id, lang: locale, path: at }))) ||
    Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
  // A version in the reader's own language when the publisher has one, else the one held,
  // shown in the reader's language from the translation cache unless they ask for the original.
  const act = await loadActView(db, { id, lang: locale, page });
  if (!act) notFound();
  const contents = await loadActContents(db, { id, lang: locale });
  const translation = await actTranslation(db, act, locale);
  // The contents in the reader's language too, where a heading has been translated (pages read so far).
  const headings =
    translation && query.original !== "1"
      ? await cachedTranslations(
          db,
          contents.map((c) => c.heading),
          locale,
        )
      : null;
  const shownContents = headings
    ? contents.map((c) => ({ ...c, heading: headings.get(textHash(c.heading)) ?? c.heading }))
    : contents;
  const t = await getTranslations({ locale, namespace: "Law" });
  const amend = await getTranslations({ locale, namespace: "Amend.act" });
  const amendments = await listAmendments(db, { actId: id, limit: 20 }).catch(() => []);
  return (
    <ActViewPage
      act={act}
      page={page}
      translation={translation}
      original={query.original === "1"}
      contents={shownContents}
      locale={locale}
      t={t}
      amendments={amendments}
      amendLabels={{
        propose: amend("propose"),
        proposals: amend("proposals"),
        noProposals: amend("noProposals"),
      }}
    />
  );
}
