import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { toLocale } from "@/i18n/routing";
import ContestPage from "@/components/places/contest-page";
import { actKey } from "@/components/law/quoted-words";
import { loadBudgetsOf } from "@/lib/budgets/read";
import { summarize } from "@/lib/budgets/summary";
import { RATES, displayCurrencyOf } from "@/lib/config/money";
import { db } from "@/lib/db/client";
import { contestView } from "@/lib/places/contest-view";
import { findAct } from "@/lib/statistics/read";

export const dynamic = "force-dynamic";

type Params = Promise<{ locale: string; slug: string }>;
type SearchParams = Promise<{ in?: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { locale: raw, slug } = await params;
  const locale = toLocale(raw);
  const view = contestView(decodeURIComponent(slug), locale);
  if (!view) return {};
  const t = await getTranslations({ locale, namespace: "Places" });
  const claimant = view.sides.find((s) => s.role === "claims")?.name ?? "";
  return {
    title: t("contested.title", { place: view.name }),
    description: t("contested.intro", { place: view.name, claimant }),
  };
}

/** One claimed place, question by question (design `2026-11-contested-law.md` §4.2). */
export default async function ContestedPlacePage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { locale: raw, slug } = await params;
  const locale = toLocale(raw);
  setRequestLocale(locale);
  const view = contestView(decodeURIComponent(slug), locale);
  if (!view) notFound();
  const acts = [
    ...view.rows.flatMap((r) =>
      r.cells.flatMap((c) => c.provisions.flatMap((p) => (p.act ? [p.act] : []))),
    ),
  ];
  const actIds = new Map<string, string>();
  for (const act of acts) {
    const key = actKey(act);
    if (actIds.has(key)) continue;
    const id = await findAct(db, act);
    if (id) actIds.set(key, id);
  }
  const money = await Promise.all(
    view.sides.map(async (side) => ({
      side,
      summary: side.holder ? summarize(await loadBudgetsOf(db, side.holder)) : null,
    })),
  );
  const [t, tb] = await Promise.all([
    getTranslations({ locale, namespace: "Places" }),
    getTranslations({ locale, namespace: "Budgets" }),
  ]);
  return (
    <ContestPage
      view={view}
      actIds={actIds}
      money={money}
      display={{ locale, currency: displayCurrencyOf((await searchParams).in), rates: RATES }}
      locale={locale}
      t={t}
      tb={tb}
    />
  );
}
