import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { toLocale } from "@/i18n/routing";
import BudgetPage from "@/components/budgets/budget-page";
import { actKey } from "@/components/law/quoted-words";
import { BUDGET_DOCUMENTS } from "@/lib/config/budgets";
import { regionName, worldRegion } from "@/lib/config/world";
import { db } from "@/lib/db/client";
import { holderOfRegion } from "@/lib/budgets/holders";
import { budgetSections } from "@/lib/budgets/page";
import { loadBudgetsOf } from "@/lib/budgets/read";
import { findAct } from "@/lib/statistics/read";

export const dynamic = "force-dynamic";

type Params = Promise<{ locale: string; slug: string }>;
type SearchParams = Promise<{ year?: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { locale: raw, slug } = await params;
  const locale = toLocale(raw);
  const region = worldRegion(decodeURIComponent(slug));
  if (!region) return {};
  const t = await getTranslations({ locale, namespace: "Budgets" });
  const place = regionName(region, locale);
  return { title: t("title", { place }), description: t("intro", { place }) };
}

/** One place's public budget, by the world list's slug (design `2026-11-budgets.md`). */
export default async function PlaceBudgetPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { locale: raw, slug } = await params;
  const locale = toLocale(raw);
  setRequestLocale(locale);
  const region = worldRegion(decodeURIComponent(slug));
  const holder = region ? holderOfRegion(region) : null;
  if (!region || !holder) notFound();
  const year = Number((await searchParams).year) || undefined;
  const sections = budgetSections(await loadBudgetsOf(db, holder), year);
  // The budget laws these sections were read from, so their quotes open the act in the register.
  const keys = new Set(sections.flatMap((s) => s.budget.sources.map((source) => source.key)));
  const actIds = new Map<string, string>();
  for (const doc of BUDGET_DOCUMENTS.filter((d) => keys.has(d.key))) {
    if (!doc.act || actIds.has(actKey(doc.act))) continue;
    const id = await findAct(db, doc.act);
    if (id) actIds.set(actKey(doc.act), id);
  }
  const t = await getTranslations({ locale, namespace: "Budgets" });
  return (
    <BudgetPage
      place={regionName(region, locale)}
      slug={region.slug}
      sections={sections}
      actIds={actIds}
      locale={locale}
      t={t}
    />
  );
}
