import { getTranslations, setRequestLocale } from "next-intl/server";
import { toLocale } from "@/i18n/routing";
import BudgetIndex from "@/components/budgets/budget-index";
import { db } from "@/lib/db/client";
import { budgetIndexRows } from "@/lib/budgets/page";
import { loadAllBudgets } from "@/lib/budgets/read";

export const dynamic = "force-dynamic";

type Params = Promise<{ locale: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const locale = toLocale((await params).locale);
  const t = await getTranslations({ locale, namespace: "Budgets" });
  return { title: t("indexTitle"), description: t("indexIntro") };
}

/** Every public budget Solon holds (design `2026-11-budgets.md`). */
export default async function BudgetsPage({ params }: { params: Params }) {
  const locale = toLocale((await params).locale);
  setRequestLocale(locale);
  const [t, budgets] = await Promise.all([
    getTranslations({ locale, namespace: "Budgets" }),
    loadAllBudgets(db),
  ]);
  return <BudgetIndex rows={budgetIndexRows(budgets, locale)} t={t} />;
}
