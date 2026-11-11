import { actKey } from "@/components/law/quoted-words";
import QuotedWords from "@/components/law/quoted-words";
import { BUDGET_DOCUMENTS, BUDGET_TAXONOMIES } from "@/lib/config/budgets";
import { placesConfig } from "@/lib/config/places";
import { formatOriginal } from "@/lib/budgets/format";
import type { Budget } from "@/lib/budgets/model";
import { categoryLabel, categoryOf } from "@/lib/budgets/taxonomy";
import { localized } from "@/lib/places/place-view";
import type { BudgetsTranslator } from "./translator";

/**
 * Where a budget's figures come from, closed until asked for. A budget read
 * from a law: the law's own words on its totals, every line as the publisher
 * printed it with the category Solon counted it in, and how the lines were
 * placed. A budget read from a statistics office: its series and the day.
 */
export default function BudgetSources({
  budget,
  actIds,
  locale,
  t,
}: {
  budget: Budget;
  actIds: ReadonlyMap<string, string>;
  locale: string;
  t: BudgetsTranslator;
}) {
  const documents = budget.sources.flatMap((s) =>
    s.kind === "document" ? BUDGET_DOCUMENTS.filter((d) => d.key === s.key) : [],
  );
  const series = budget.sources.filter((s) => s.kind === "facts");
  const labels = {
    translation: t("sources.translation"),
    read: (date: string) => t("sources.read", { date }),
    translatedBy: (translator: string) => t("sources.translatedBy", { translator }),
  };
  const amount = (v: number) => formatOriginal(v, budget, locale);
  const nameOf = (side: "revenue" | "expenditure", code: string | null) => {
    const c = code ? categoryOf(BUDGET_TAXONOMIES[side], code) : undefined;
    return c ? localized(categoryLabel(c), locale) : t("sources.notPlaced");
  };
  return (
    <details className="rounded-surface border border-default bg-surface-base p-5 text-sm sm:p-6">
      <summary className="cursor-pointer font-semibold text-fg-primary">
        {t("sources.title")}
      </summary>
      <div className="mt-4 space-y-6">
        {series.map((s) => {
          const source = placesConfig.sources.find((c) => c.key === s.key);
          const name = source?.attribution ? localized(source.attribution, locale) : s.key;
          return (
            <p key={s.key} className="mb-0 text-fg-secondary">
              <a
                href={source?.homepage ?? s.url ?? "#"}
                className="underline"
                rel="noopener noreferrer"
              >
                {t("sources.facts", { publisher: name, date: s.read ?? "" })}
              </a>
            </p>
          );
        })}
        {documents.map((doc) => (
          <div key={doc.key} className="space-y-4">
            {doc.quote ? (
              <QuotedWords
                label={doc.lang === locale ? doc.title : localized(doc.titleTranslation, locale)}
                quote={doc.quote}
                actId={doc.act ? (actIds.get(actKey(doc.act)) ?? null) : null}
                locale={locale}
                labels={labels}
              />
            ) : (
              <QuotedWords
                label={doc.lang === locale ? doc.title : localized(doc.titleTranslation, locale)}
                quote={{
                  text: doc.title,
                  lang: doc.lang,
                  translation: doc.titleTranslation,
                  evidence: doc.evidence,
                }}
                actId={null}
                locale={locale}
                labels={labels}
              />
            )}
            <div>
              <h3 className="mb-1 font-semibold text-fg-primary">{t("sources.placement")}</h3>
              <p className="mb-0 text-fg-secondary">{localized(doc.placement, locale)}</p>
            </div>
            <details>
              <summary className="cursor-pointer font-semibold text-fg-primary">
                {t("sources.lines", { count: doc.lines.length })}
              </summary>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-fg-tertiary">
                    <tr>
                      <th className="py-1 pr-3 font-medium">{t("sources.code")}</th>
                      <th className="py-1 pr-3 font-medium">{t("sources.line")}</th>
                      <th className="py-1 pr-3 text-right font-medium">{t("sources.amount")}</th>
                      <th className="py-1 font-medium">{t("sources.category")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-default text-fg-secondary">
                    {doc.lines.map((l) => (
                      <tr key={`${l.side}-${l.code}`}>
                        <td className="py-1 pr-3 font-mono">{l.code}</td>
                        <td className="py-1 pr-3">{localized(l.label, locale)}</td>
                        <td className="py-1 pr-3 text-right">{amount(l.amount)}</td>
                        <td className="py-1">{nameOf(l.side, l.category)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </div>
        ))}
      </div>
    </details>
  );
}
