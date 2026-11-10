import { Link } from "@/i18n/navigation";
import PageLayout from "@/components/ui/page-layout";
import type { BudgetIndexRow } from "@/lib/budgets/page";
import type { BudgetsTranslator } from "./translator";

/** Every holder Solon holds a budget for: its newest year, the totals and where most of the money goes. */
export default function BudgetIndex({
  rows,
  t,
}: {
  rows: readonly BudgetIndexRow[];
  t: BudgetsTranslator;
}) {
  return (
    <PageLayout title={t("indexTitle")} kicker={t("kicker")} description={t("indexIntro")}>
      {rows.length === 0 ? (
        <p className="text-fg-secondary">{t("indexEmpty")}</p>
      ) : (
        <ul className="max-w-4xl divide-y divide-default overflow-hidden rounded-surface border border-default bg-surface-base">
          {rows.map((row) => (
            <li key={`${row.slug}-${row.scope}`}>
              <Link
                href={`/budgets/${row.slug}`}
                className="flex min-h-11 flex-col gap-1 px-5 py-3 hover:bg-surface-raised sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6"
              >
                <span className="min-w-0">
                  <span className="block font-medium text-fg-primary">{row.name}</span>
                  <span className="block text-sm text-fg-tertiary">
                    {row.scope} · {row.year}
                    {row.largest ? ` · ${t("columns.largest")}: ${row.largest}` : ""}
                  </span>
                </span>
                <span className="shrink-0 text-sm text-fg-secondary">
                  {[
                    row.spending && `${t("columns.spending")} ${row.spending}`,
                    row.balance && `${t("columns.balance")} ${row.balance}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}{" "}
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageLayout>
  );
}
