import type { useTranslations } from "next-intl";

/** The translator the budget components take: one type, so none imports another for it. */
export type BudgetsTranslator = ReturnType<typeof useTranslations<"Budgets">>;
