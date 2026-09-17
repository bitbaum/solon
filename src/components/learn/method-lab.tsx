"use client";

import { useMemo, useState } from "react";
import { methodSpec } from "@/lib/domain/methods";
import type { MethodId } from "@/lib/domain/methods/types";
import {
  FUND_OPTIONS,
  FUND_PREFERENCES,
  APPROVAL_FLOOR,
  ballotsFor,
  firstPreferenceCounts,
  labelFor,
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

type Tab = { id: "plurality" | MethodId; label: string; asks: string; unit?: string };

const TABS: Tab[] = [
  {
    id: "plurality",
    label: "Pick one",
    asks: "Which single option do you want most?",
  },
  {
    id: "approval",
    label: "Approval",
    asks: "Which options could you live with?",
    unit: "approvals",
  },
  { id: "dot", label: "Dots", asks: "How would you split five dots across them?", unit: "dots" },
  { id: "score", label: "Score", asks: "Rate each option from 0 to 5.", unit: "avg" },
  { id: "ranked", label: "Ranked", asks: "Put them in your order of preference.", unit: "points" },
];

/**
 * One member's appetite for one option, 0-5.
 *
 * When the approval tab is showing, the dots also answer the question that tab
 * raises — which of these counted as "acceptable"? An option rated below the
 * floor dims, so the reader can see the approval tally being assembled out of
 * the same table rather than having to take the bar chart on faith.
 */
function Rating({ value, floorApplies }: { value: number; floorApplies: boolean }) {
  const approved = value >= APPROVAL_FLOOR;
  const filled = floorApplies && !approved ? "bg-border-strong" : "bg-accent";
  return (
    <span
      className="inline-flex gap-0.5"
      aria-label={
        floorApplies
          ? `${value} out of 5 — ${approved ? "approved" : "not approved"}`
          : `${value} out of 5`
      }
    >
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

export function MethodLab() {
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
  const winnerLabel = labelFor(FUND_OPTIONS, winner.key);

  return (
    <div className="space-y-8">
      {/* The room. Constant across every tab — that is the point. */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] border-collapse text-sm">
          <caption className="sr-only">
            How each group of members rates each option, from 0 to 5
          </caption>
          <thead>
            <tr className="border-b border-default">
              <th scope="col" className="py-3 pr-4 text-left font-semibold text-fg-primary">
                {TOTAL_MEMBERS} members
              </th>
              {FUND_OPTIONS.map((o) => (
                <th
                  key={o.key}
                  scope="col"
                  className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-caps text-fg-secondary"
                >
                  {o.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FUND_PREFERENCES.map((camp) => (
              <tr key={camp.label} className="border-b border-subtle">
                <th scope="row" className="py-4 pr-4 text-left font-normal text-fg-secondary">
                  {camp.label}
                </th>
                {FUND_OPTIONS.map((o) => (
                  <td key={o.key} className="px-3 py-4">
                    <Rating value={camp.ratings[o.key] ?? 0} floorApplies={tab === "approval"} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* The switcher. */}
      <div>
        <div
          className="flex flex-wrap gap-2"
          role="tablist"
          aria-label="How to count the same preferences"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={t.id === tab}
              onClick={() => setTab(t.id)}
              className={`min-h-11 rounded-pill border px-4 text-sm transition-colors ${
                t.id === tab
                  ? "border-accent bg-accent text-on-accent"
                  : "border-default text-fg-secondary hover:border-interactive hover:text-fg-primary"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="mt-4 text-sm text-fg-secondary">
          <span className="text-fg-muted">The ballot asks:</span> {active.asks}
          {tab === "approval" && (
            <span className="text-fg-muted">
              {" "}
              Anything rated {APPROVAL_FLOOR} or more counts as acceptable; the rest dim above.
            </span>
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
                    {entry.label}
                  </span>
                  <span className="font-mono text-sm tabular-nums text-fg-primary">
                    {entry.count}
                    <span className="text-fg-muted"> first choices</span>
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
          result && <TallyChart aggregate={result} unit={active.unit} />
        )}

        <p className="mt-6 border-t border-subtle pt-5 text-sm leading-relaxed text-fg-secondary">
          {tab === "plurality" ? (
            <>
              <span className="font-semibold text-fg-primary">
                {winnerLabel} wins with {plurality[0].count} of {TOTAL_MEMBERS}.
              </span>{" "}
              Four of the seven members rated it zero. Nothing was counted wrongly — this is what
              &ldquo;pick one&rdquo; is for, and it is why the option most people can live with can
              lose to the one a large minority loves.
            </>
          ) : (
            <>
              <span className="font-semibold text-fg-primary">{winnerLabel} wins.</span> Same seven
              members, same preferences, a different question — and a different answer.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
