import { Link } from "@/i18n/navigation";
import PageLayout from "@/components/ui/page-layout";
import { cite } from "@/lib/i18n/config-catalog";
import type { ContestSideView, ContestView } from "@/lib/places/contest-view";
import QuotedWords, { actKey } from "@/components/law/quoted-words";
import type { BudgetsTranslator } from "@/components/budgets/translator";
import type { MoneyDisplay } from "@/lib/budgets/format";
import type { BudgetSummary } from "@/lib/budgets/summary";
import ContestMoney from "./contest-money";
import { PlaceTrail } from "./place-head";
import ShareButton from "./share-button";
import type { PlacesTranslator } from "./translator";

interface ContestPageProps {
  view: ContestView;
  /** Solon's id of each act a provision cites, by `authority:scheme:value`, when the register holds it. */
  actIds: ReadonlyMap<string, string>;
  locale: string;
  /** Each side's budget, when Solon holds one. */
  money: readonly { side: ContestSideView; summary: BudgetSummary | null }[];
  /** How money is shown to the reader. */
  display: MoneyDisplay;
  t: PlacesTranslator;
  tb: BudgetsTranslator;
}

function SideCard({ side, t }: { side: ContestSideView; t: PlacesTranslator }) {
  return (
    <li className="min-w-0 space-y-2 rounded-surface border border-default bg-surface-base p-5">
      <p className="mb-0 text-sm text-fg-tertiary">{t(`contested.role.${side.role}`)}</p>
      <p className="mb-0 text-lg font-semibold text-fg-primary">
        <Link href={side.href} className="hover:underline">
          {side.name}
        </Link>
      </p>
      {side.lawAuthority ? (
        <Link
          href={`/law/place/${side.lawAuthority}`}
          className="inline-block text-sm font-semibold text-fg-primary hover:underline"
        >
          {t("contested.readLaw", { side: side.name })} →
        </Link>
      ) : (
        <p className="mb-0 text-sm text-fg-secondary">
          {t("contested.lawNotHeld", { side: side.name })}
        </p>
      )}
    </li>
  );
}

/**
 * A claimed place, question by question: who governs it and who claims it, then
 * for each question the same for every place, each side's own words beside the
 * other's, in a fixed order (the side that governs, then the claimant). A side
 * with nothing read says so. Solon's words only frame; the rest is quotation.
 */
export default function ContestPage({
  view,
  actIds,
  money,
  display,
  locale,
  t,
  tb,
}: ContestPageProps) {
  const quoteLabels = {
    translation: t("contested.translation"),
    read: (date: string) => t("contested.read", { date }),
    translatedBy: (translator: string) => t("contested.translatedBy", { translator }),
    proposeChange: t("contested.proposeChange"),
  };
  const claimant = view.sides.find((s) => s.role === "claims");
  return (
    <PageLayout
      title={t("contested.title", { place: view.name })}
      kicker={t("contested.kicker")}
      description={t("contested.intro", {
        place: view.name,
        claimant: claimant?.name ?? "",
      })}
    >
      <div className="max-w-5xl space-y-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <PlaceTrail above={[]} t={t} />
          <ShareButton title={view.name} />
        </div>

        <ul className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
          {view.sides.map((side) => (
            <SideCard key={side.key} side={side} t={t} />
          ))}
        </ul>

        <p className="mb-0 text-sm text-fg-secondary">
          {t("contested.progress", { compared: view.compared, topics: view.topics })}
        </p>

        {view.rows.map((row) => (
          <section
            key={row.key}
            aria-labelledby={`topic-${row.key}`}
            className="rounded-surface border border-default bg-surface-base"
          >
            <div className="border-b border-default p-5 sm:p-6">
              <h2 id={`topic-${row.key}`} className="font-semibold text-fg-primary">
                {row.label}
              </h2>
              <p className="mb-0 mt-1 text-sm text-fg-secondary">{row.question}</p>
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)] divide-y divide-default md:grid-cols-2 md:divide-x md:divide-y-0">
              {row.cells.map((cell) => {
                const side = view.sides.find((s) => s.key === cell.side)!;
                return (
                  <div key={cell.side} className="min-w-0 space-y-4 p-5 sm:p-6">
                    <h3 className="text-sm font-semibold text-fg-secondary">{side.name}</h3>
                    {cell.provisions.length > 0 ? (
                      cell.provisions.map((p) => (
                        <QuotedWords
                          key={p.label}
                          label={cite(p.label, locale)}
                          quote={p.quote}
                          provision={p.provision}
                          translator={p.translator}
                          actId={p.act ? (actIds.get(actKey(p.act)) ?? null) : null}
                          locale={locale}
                          labels={quoteLabels}
                        />
                      ))
                    ) : (
                      <p className="mb-0 text-sm text-fg-secondary">
                        {t("contested.gap", { side: side.name })}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        <ContestMoney sides={money} display={display} t={t} tb={tb} />

        <section
          aria-labelledby="contest-act"
          className="rounded-surface border border-default bg-surface-base p-5 sm:p-6"
        >
          <h2 id="contest-act" className="mb-1 font-semibold text-fg-primary">
            {t("contested.actTitle")}
          </h2>
          <p className="mb-4 text-sm text-fg-secondary">
            {t("contested.actIntro", { place: view.name })}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {view.sides.flatMap((side, i) =>
              side.lawAuthority
                ? [
                    <Link
                      key={side.key}
                      href={`/law/place/${side.lawAuthority}`}
                      className={i === 0 ? "btn-primary min-h-11" : "btn-secondary min-h-11"}
                    >
                      {t("contested.proposeLaw", { side: side.name })}
                    </Link>,
                  ]
                : [],
            )}
          </div>
        </section>

        <details className="rounded-surface border border-default bg-surface-base p-5 text-sm sm:p-6">
          <summary className="cursor-pointer font-semibold text-fg-primary">
            {t("contested.methodTitle")}
          </summary>
          <div className="mt-4 space-y-3 text-fg-secondary">
            {view.open && <p className="mb-0">{view.open}</p>}
            <p className="mb-0">{t("contested.method")}</p>
            <Link href="/places/contested" className="inline-block text-fg-primary hover:underline">
              {t("contested.all")} →
            </Link>
          </div>
        </details>
      </div>
    </PageLayout>
  );
}
