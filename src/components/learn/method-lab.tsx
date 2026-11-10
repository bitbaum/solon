"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { methodSpec } from "@/lib/domain/methods";
import type { MethodId } from "@/lib/domain/methods/types";
import {
  FUND_OPTIONS,
  FUND_PREFERENCES,
  APPROVAL_FLOOR,
  ballotsFor,
  firstPreferenceCounts,
  TOTAL_MEMBERS,
} from "@/lib/governance/worked-example";
import { TallyChart } from "./tally";

/**
 * The centrepiece: one room, one set of preferences, counted five ways.
 *
 * This runs Solon's real `aggregate()` in the reader's browser — the same
 * function that counts a live session — so the page cannot drift from the
 * product, and nothing here is a mock of a result. The ballots are derived from
 * the preference table above the switcher, which is the claim being made: the
 * VOTERS are constant and the METHOD is what moves the winner.
 *
 * "Pick one" is included and is deliberately not a Solon method. It is the
 * default almost every group reaches for, and seeing it elect a minority's
 * favourite is the reason the other five exist.
 */

type Unit = "approvals" | "dots" | "avg" | "points";
type TabId = "plurality" | Extract<MethodId, "approval" | "dot" | "score" | "ranked">;
type Tab = { id: TabId; unit?: Unit };

/** The tabs, in order; their words are the `MethodLab` messages, in the reader's language. */
const TABS: Tab[] = [
  { id: "plurality" },
  { id: "approval", unit: "approvals" },
  { id: "dot", unit: "dots" },
  { id: "score", unit: "avg" },
  { id: "ranked", unit: "points" },
];

/**
 * One member's appetite for one option, 0-5.
 *
 * When the approval tab is showing, the dots also answer the question that tab
 * raises — which of these counted as "acceptable"? An option rated below the
 * floor dims, so the reader can see the approval tally being assembled out of
 * the same table rather than having to take the bar chart on faith.
 */
function Rating({
  value,
  floorApplies,
  label,
}: {
  value: number;
  floorApplies: boolean;
  label: string;
}) {
  const approved = value >= APPROVAL_FLOOR;
  const filled = floorApplies && !approved ? "bg-border-strong" : "bg-accent";
  return (
    <span className="inline-flex gap-0.5" aria-label={label}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={`h-2.5 w-2.5 rounded-pill ${n <= value ? filled : "bg-surface-overlay"}`}
          aria-hidden
        />
      ))}
    </span>
  );
}

type FundOption = "roof" | "apprenticeship" | "tooling" | "reserve";
type Camp = "daily" | "train" | "work";

export function MethodLab() {
  const t = useTranslations("MethodLab");
  const optionLabel = (key: string) =>
    FUND_OPTIONS.some((o) => o.key === key) ? t(`options.${key as FundOption}`) : "—";
  const ratingLabel = (value: number, floorApplies: boolean) =>
    !floorApplies
      ? t("rating", { value })
      : value >= APPROVAL_FLOOR
        ? t("ratingApproved", { value })
        : t("ratingNotApproved", { value });
  const [tab, setTab] = useState<Tab["id"]>("plurality");
  const active = TABS.find((t) => t.id === tab)!;

  const result = useMemo(() => {
    if (tab === "plurality") return null;
    const method = tab as MethodId;
    return methodSpec(method).aggregate(
      ballotsFor(method as "approval" | "dot" | "score" | "ranked"),
      [...FUND_OPTIONS],
    );
  }, [tab]);

  const plurality = useMemo(() => firstPreferenceCounts(), []);
  const winner =
    tab === "plurality" ? plurality[0] : { key: result?.ranked?.[0]?.key ?? "", count: 0 };
  const winnerLabel = optionLabel(winner.key);

  return (
    <div className="space-y-8">
      {/* The room. Constant across every tab — that is the point. */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] border-collapse text-sm">
          <caption className="sr-only">{t("caption")}</caption>
          <thead>
            <tr className="border-b border-default">
              <th scope="col" className="py-3 pr-4 text-left font-semibold text-fg-primary">
                {t("members", { count: TOTAL_MEMBERS })}
              </th>
              {FUND_OPTIONS.map((o) => (
                <th
                  key={o.key}
                  scope="col"
                  className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-caps text-fg-secondary"
                >
                  {optionLabel(o.key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FUND_PREFERENCES.map((camp) => (
              <tr key={camp.key} className="border-b border-subtle">
                <th scope="row" className="py-4 pr-4 text-left font-normal text-fg-secondary">
                  {t(`camps.${camp.key as Camp}`)}
                </th>
                {FUND_OPTIONS.map((o) => (
                  <td key={o.key} className="px-3 py-4">
                    <Rating
                      value={camp.ratings[o.key] ?? 0}
                      floorApplies={tab === "approval"}
                      label={ratingLabel(camp.ratings[o.key] ?? 0, tab === "approval")}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* The switcher. */}
      <div>
        <div className="flex flex-wrap gap-2" role="tablist" aria-label={t("tablist")}>
          {TABS.map((t2) => (
            <button
              key={t2.id}
              type="button"
              role="tab"
              aria-selected={t2.id === tab}
              onClick={() => setTab(t2.id)}
              className={`min-h-11 rounded-pill border px-4 text-sm transition-colors ${
                t2.id === tab
                  ? "border-accent bg-accent text-on-accent"
                  : "border-default text-fg-secondary hover:border-interactive hover:text-fg-primary"
              }`}
            >
              {t(`tabs.${t2.id}.label`)}
            </button>
          ))}
        </div>
        <p className="mt-4 text-sm text-fg-secondary">
          <span className="text-fg-muted">{t("asks")}</span> {t(`tabs.${active.id}.asks`)}
          {tab === "approval" && (
            <span className="text-fg-muted"> {t("floor", { floor: APPROVAL_FLOOR })}</span>
          )}
        </p>
      </div>

      {/* The result. */}
      <div className="rounded-control border border-default bg-surface-raised p-5 sm:p-6">
        {tab === "plurality" ? (
          <ol className="space-y-4">
            {plurality.map((entry, i) => (
              <li key={entry.key}>
                <div className="flex items-baseline justify-between gap-4">
                  <span
                    className={`text-sm ${i === 0 ? "font-semibold text-fg-primary" : "text-fg-secondary"}`}
                  >
                    {optionLabel(entry.key)}
                  </span>
                  <span className="font-mono text-sm tabular-nums text-fg-primary">
                    {entry.count}
                    <span className="text-fg-muted"> {t("firstChoices")}</span>
                  </span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-pill bg-surface-overlay">
                  <div
                    className={`h-full rounded-pill ${i === 0 ? "bg-status-warning" : "bg-border-strong"}`}
                    style={{ width: `${(entry.count / TOTAL_MEMBERS) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ol>
        ) : (
          result && (
            <TallyChart
              aggregate={result}
              unit={active.unit ? t(`units.${active.unit}`) : undefined}
              labelOf={optionLabel}
            />
          )
        )}

        <p className="mt-6 border-t border-subtle pt-5 text-sm leading-relaxed text-fg-secondary">
          {tab === "plurality" ? (
            <>
              <span className="font-semibold text-fg-primary">
                {t("pluralityWins", {
                  winner: winnerLabel,
                  count: plurality[0].count,
                  total: TOTAL_MEMBERS,
                })}
              </span>{" "}
              {t("pluralityNote")}
            </>
          ) : (
            <>
              <span className="font-semibold text-fg-primary">
                {t("otherWins", { winner: winnerLabel })}
              </span>{" "}
              {t("otherNote")}
            </>
          )}
        </p>
      </div>
    </div>
  );
}
