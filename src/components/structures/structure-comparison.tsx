import type { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { StructureValue } from "@/lib/config/structures";
import type { CheckedCitation, StructureCell, StructureTable } from "@/lib/structures/view";

type T = Awaited<ReturnType<typeof getTranslations<"Structures">>>;

interface StructureComparisonProps {
  table: StructureTable;
  locale: string;
  t: T;
}

const cardClass = "min-w-0 rounded-surface border border-default bg-surface-base p-4";

function formatValue(value: StructureValue, locale: string, t: T): string {
  switch (value.kind) {
    case "amount":
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: value.currency,
        maximumFractionDigits: 0,
      }).format(value.amount);
    case "rate": {
      const rate = new Intl.NumberFormat(locale, {
        style: "percent",
        maximumFractionDigits: 2,
      }).format(value.percent / 100);
      return value.scope ? t(`scopes.${value.scope}`, { rate }) : rate;
    }
    case "text":
      return t(`values.${value.key}` as Parameters<T>[0]);
  }
}

function Citation({ cite, t }: { cite: CheckedCitation; t: T }) {
  return (
    <li className="space-y-1">
      <Link
        href={`/law/${cite.act}?at=${cite.path}#${cite.path}`}
        className="text-fg-secondary underline"
      >
        {cite.heading}
      </Link>
      <blockquote lang="de" className="border-l border-default pl-3 text-fg-tertiary">
        «{cite.quote}»
      </blockquote>
      {cite.status === "amended" && <p className="mb-0 text-fg-tertiary">{t("amended")}</p>}
    </li>
  );
}

function Cell({ cell, t, locale }: { cell: StructureCell | null; t: T; locale: string }) {
  if (!cell) return <p className="mb-0 text-fg-tertiary">{t("missing")}</p>;
  return (
    <>
      <p className="mb-0 font-medium text-fg-primary">{formatValue(cell.value, locale, t)}</p>
      <details className="text-sm">
        <summary className="cursor-pointer text-fg-secondary">
          {t("source", { count: cell.cites.length })}
        </summary>
        <ul className="mt-2 space-y-3">
          {cell.cites.map((c) => (
            <Citation key={`${c.act}#${c.path}#${c.quote}`} cite={c} t={t} />
          ))}
        </ul>
      </details>
    </>
  );
}

/**
 * Structures side by side (design: docs/design/2026-10-structures-as-data.md
 * §1): one section per row, every structure in the same place in each, a
 * missing fact shown as missing, and no score.
 */
export default function StructureComparison({ table, locale, t }: StructureComparisonProps) {
  const kindName = (key: string) => t(`kinds.${key}` as Parameters<T>[0]);
  const placeName = (place: string) => t(`places.${place}` as Parameters<T>[0]);
  return (
    <div className="space-y-10">
      <p className="max-w-2xl text-fg-secondary">{t("notAdvice")}</p>

      <section aria-labelledby="structures-kinds" className="space-y-4">
        <h2 id="structures-kinds" className="font-semibold text-fg-primary">
          {t("kindsTitle")}
        </h2>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {table.columns.map((c) => (
            <li key={c.key} className={`${cardClass} space-y-2`}>
              <p className="mb-0 font-medium text-fg-primary">{kindName(c.key)}</p>
              <p className="mb-0 text-sm text-fg-secondary">{placeName(c.place)}</p>
              <p className="mb-0 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <Link href={`/law/${c.act}`} className="text-fg-secondary underline">
                  {t("readAct")}
                </Link>
                <Link href="/law/ask" className="text-fg-secondary underline">
                  {t("ask")}
                </Link>
              </p>
            </li>
          ))}
        </ul>
      </section>

      {table.rows.map(({ row, cells }) => (
        <section key={row} aria-labelledby={`row-${row}`} className="space-y-3">
          <h2 id={`row-${row}`} className="font-semibold text-fg-primary">
            {t(`rows.${row}`)}
          </h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {cells.map((cell, i) => {
              const column = table.columns[i]!;
              return (
                <li key={column.key} className={`${cardClass} space-y-2`}>
                  <p className="mb-0 text-sm text-fg-tertiary">
                    {kindName(column.key)} · {placeName(column.place)}
                  </p>
                  <Cell cell={cell} t={t} locale={locale} />
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
