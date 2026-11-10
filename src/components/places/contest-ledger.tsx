import { ShareBars } from "@bitbaum/chartkit/react";
import type { ContestLedgerView, ContestView } from "@/lib/places/contest-view";
import { actKey, ProvisionQuote } from "./contest-quote";
import type { PlacesTranslator } from "./translator";

/**
 * What each side's public budget rested on, from its own budget law: what it
 * raised itself and what it received, and from whom; then what the law's own
 * figures say by arithmetic about spending the same without what was received.
 * Arithmetic, not a forecast, and the section says so.
 */
export default function ContestLedger({
  view,
  actIds,
  locale,
  t,
}: {
  view: ContestView;
  actIds: ReadonlyMap<string, string>;
  locale: string;
  t: PlacesTranslator;
}) {
  const withLedger = new Set(view.ledgers.map((l) => l.side));
  const without = view.sides.filter((s) => !withLedger.has(s.key));
  return (
    <section
      aria-labelledby="contest-money"
      className="rounded-surface border border-default bg-surface-base"
    >
      <div className="border-b border-default p-5 sm:p-6">
        <h2 id="contest-money" className="font-semibold text-fg-primary">
          {t("contested.money.title")}
        </h2>
        <p className="mb-0 mt-1 text-sm text-fg-secondary">{t("contested.money.question")}</p>
      </div>
      <div className="space-y-8 p-5 sm:p-6">
        {view.ledgers.map((l) => (
          <LedgerBlock
            key={`${l.side}-${l.ledger.year}`}
            l={l}
            actIds={actIds}
            locale={locale}
            t={t}
          />
        ))}
        {without.map((side) => (
          <p key={side.key} className="mb-0 text-sm text-fg-secondary">
            {t("contested.money.notRead", { side: side.name })}
          </p>
        ))}
      </div>
    </section>
  );
}

function LedgerBlock({
  l,
  actIds,
  locale,
  t,
}: {
  l: ContestLedgerView;
  actIds: ReadonlyMap<string, string>;
  locale: string;
  t: PlacesTranslator;
}) {
  const { ledger, arithmetic: a } = l;
  const money = (amount: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: ledger.currency,
      notation: "compact",
      maximumFractionDigits: 2,
    }).format(amount * ledger.unit);
  const percent = (share: number) =>
    new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 }).format(share);
  const times = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  // One segment per giver, so the bar answers "who pays for this".
  const byGiver = new Map<string, number>();
  for (const line of l.lines) {
    if (line.kind === "received" && line.from) {
      byGiver.set(line.from, (byGiver.get(line.from) ?? 0) + line.amount);
    }
  }
  const rows = [
    { label: t("contested.money.own"), share: a.own / ledger.revenue },
    ...[...byGiver].map(([from, amount]) => ({
      label: t("contested.money.from", { from }),
      share: amount / ledger.revenue,
    })),
  ];
  return (
    <div className="space-y-5">
      <h3 className="text-sm font-semibold text-fg-secondary">
        {t("contested.money.year", { side: l.sideName, year: ledger.year })}
      </h3>
      <ShareBars
        rows={rows}
        caption={t("contested.money.caption", {
          side: l.sideName,
          year: ledger.year,
          total: money(ledger.revenue),
        })}
      />
      <dl className="grid grid-cols-[minmax(0,1fr)] gap-3 text-sm sm:grid-cols-2">
        {[
          [t("contested.money.revenue"), money(ledger.revenue)],
          [t("contested.money.spent"), money(ledger.expenditure)],
          [t("contested.money.ownCovered"), percent(a.ownCoverage)],
          [t("contested.money.receivedShare"), percent(a.receivedShare)],
        ].map(([label, value]) => (
          <div
            key={label}
            className="flex items-baseline justify-between gap-3 rounded-surface border border-default px-4 py-3"
          >
            <dt className="text-fg-secondary">{label}</dt>
            <dd className="mb-0 font-semibold text-fg-primary">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="space-y-2 rounded-surface border border-default bg-surface-raised p-4 text-sm">
        <p className="mb-0 font-semibold text-fg-primary">{t("contested.money.withoutTitle")}</p>
        <p className="mb-0 text-fg-primary">
          {t("contested.money.without", {
            side: l.sideName,
            multiple: a.ownMultipleNeeded === null ? "—" : times.format(a.ownMultipleNeeded),
            cut: percent(a.spendingCutNeeded),
          })}
        </p>
        <p className="mb-0 text-fg-secondary">{t("contested.money.notForecast")}</p>
      </div>
      <ProvisionQuote
        provision={{
          topic: "money",
          side: l.side,
          label: ledger.label,
          act: ledger.act,
          provision: null,
          quote: ledger.quote,
        }}
        actId={ledger.act ? (actIds.get(actKey(ledger.act)) ?? null) : null}
        locale={locale}
        t={t}
      />
    </div>
  );
}
