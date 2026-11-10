import { getTranslations, setRequestLocale } from "next-intl/server";
import { toLocale } from "@/i18n/routing";
import BudgetIndex from "@/components/budgets/budget-index";
import { getPathname } from "@/i18n/navigation";
import { readerMoney } from "@/lib/site/reader-money";
import { db } from "@/lib/db/client";
import { budgetIndexRows } from "@/lib/budgets/page";
import { loadAllBudgets } from "@/lib/budgets/read";

export const dynamic = "force-dynamic";

type Params = Promise<{ locale: string }>;
type SearchParams = Promise<{ in?: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const locale = toLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Budgets" });
  return { title: t("indexTitle"), description: t("indexIntro") };
}

/** Every public budget Solon holds (design `2026-11-budgets.md`). */
export default async function BudgetsPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const locale = toLocale((await params).locale);
  setRequestLocale(locale);
  const [t, budgets] = await Promise.all([
    getTranslations({ locale, namespace: "Budgets" }),
    loadAllBudgets(db),
  ]);
  const display = await readerMoney(locale, (await searchParams).in);
  return (
    <BudgetIndex
      rows={budgetIndexRows(budgets, display)}
      currency={display.currency}
      next={getPathname({ href: "/budgets", locale })}
      t={t}
    />
  );
}
