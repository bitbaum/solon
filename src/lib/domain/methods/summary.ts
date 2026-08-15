import type { Aggregate } from "./types";

/**
 * One line describing where a vote stands, in the terms its own method uses.
 *
 * A yes/no session reads as counts; a ranking reads as its leader. Forcing
 * every method through a yes/no shape was the old limitation — a dot vote
 * rendered as "yes 12 · no 0" says nothing true about what the members
 * actually chose.
 */
export function summarizeAggregate(aggregate: Aggregate | null | undefined): string {
  if (!aggregate || aggregate.ballotCount === 0) return "No ballots cast yet.";

  if (aggregate.kind === "ranking") {
    const top = aggregate.ranked?.[0];
    if (!top) return `${aggregate.ballotCount} ballots cast.`;
    const contested =
      aggregate.condorcetKey && aggregate.condorcetKey !== top.key
        ? " · head-to-head favours a different option"
        : "";
    return `leading: ${top.label} (${top.percent}%)${contested}`;
  }

  const d = aggregate.decisive;
  if (!d) return `${aggregate.ballotCount} ballots cast.`;

  if (aggregate.method === "consent") {
    const objections = aggregate.objections?.length ?? 0;
    return objections > 0
      ? `${objections} objection${objections === 1 ? "" : "s"} to resolve · ${d.for} agree`
      : `no objections · ${d.for} agree · ${d.abstain} abstain`;
  }

  return `yes ${d.for} · no ${d.against} · abstain ${d.abstain}`;
}
