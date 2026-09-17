import type { Aggregate } from "@/lib/domain/methods/types";

/**
 * An Aggregate, drawn. This is the only place the section turns a tally into
 * pixels, so every method's result is read the same way and the comparison
 * across methods is a comparison of outcomes rather than of chart styles.
 *
 * It renders whatever the method produced and never re-counts anything: the
 * bars are `aggregate.ranked` / `aggregate.decisive` as Solon computed them.
 */

function Bar({ percent, leading }: { percent: number; leading: boolean }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-pill bg-surface-overlay">
      <div
        className={`h-full rounded-pill ${leading ? "bg-accent" : "bg-border-strong"}`}
        style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
      />
    </div>
  );
}

export function TallyChart({
  aggregate,
  unit,
  highlightKey,
}: {
  aggregate: Aggregate;
  /** What the number means for this method: "approvals", "dots", "avg", "points". */
  unit?: string;
  /** Force the highlight (used to mark the Condorcet winner when it differs). */
  highlightKey?: string | null;
}) {
  if (aggregate.kind === "ranking" && aggregate.ranked) {
    const top = aggregate.ranked[0]?.key;
    const marked = highlightKey ?? top;
    return (
      <ol className="space-y-4">
        {aggregate.ranked.map((entry) => (
          <li key={entry.key}>
            <div className="flex items-baseline justify-between gap-4">
              <span
                className={`text-sm ${entry.key === marked ? "font-semibold text-fg-primary" : "text-fg-secondary"}`}
              >
                {entry.label}
              </span>
              <span className="font-mono text-sm tabular-nums text-fg-primary">
                {entry.score}
                {unit ? <span className="text-fg-muted"> {unit}</span> : null}
              </span>
            </div>
            <div className="mt-2">
              <Bar percent={entry.percent} leading={entry.key === marked} />
            </div>
          </li>
        ))}
      </ol>
    );
  }

  const d = aggregate.decisive;
  if (!d) return null;
  const total = d.for + d.against + d.abstain || 1;
  const rows: { label: string; value: number; tone: string }[] = [
    {
      label: aggregate.method === "consent" ? "Agree" : "Yes",
      value: d.for,
      tone: "bg-status-positive",
    },
    {
      label: aggregate.method === "consent" ? "Object" : "No",
      value: d.against,
      tone: "bg-status-negative",
    },
    { label: "Abstain", value: d.abstain, tone: "bg-status-neutral" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex h-3 w-full overflow-hidden rounded-pill bg-surface-overlay">
        {rows.map((r) =>
          r.value > 0 ? (
            <div
              key={r.label}
              className={r.tone}
              style={{ width: `${(r.value / total) * 100}%` }}
            />
          ) : null,
        )}
      </div>
      <dl className="grid grid-cols-3 gap-4">
        {rows.map((r) => (
          <div key={r.label}>
            <dt className="flex items-center gap-2 text-xs uppercase tracking-caps text-fg-muted">
              <span className={`h-2 w-2 rounded-pill ${r.tone}`} aria-hidden />
              {r.label}
            </dt>
            <dd className="mt-1 font-mono text-2xl tabular-nums text-fg-primary">{r.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/**
 * Consent's objections, shown with their reasons. Rendering the count alone
 * would reproduce exactly the flattening consent exists to prevent: the number
 * of objections is not the information, the stated harm is.
 */
export function Objections({ aggregate }: { aggregate: Aggregate }) {
  const objections = aggregate.objections ?? [];
  if (objections.length === 0) return null;
  return (
    <ul className="space-y-3">
      {objections.map((o, i) => (
        <li
          key={i}
          className="rounded-control border border-default border-l-2 border-l-status-negative bg-surface-raised px-4 py-3"
        >
          <p className="text-sm leading-relaxed text-fg-primary">{o.rationale}</p>
        </li>
      ))}
    </ul>
  );
}
