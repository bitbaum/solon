import { VoteThreshold, SessionOutcome } from "@prisma/client";
import { SUPERMAJORITY_FRACTION } from "@/lib/config/governance";
import type { Aggregate } from "@/lib/domain/methods/types";

/**
 * The yes/no/abstain view of a result. Every decision method produces one;
 * ranking methods do not, because "how many were against" is not a question a
 * five-way choice answers.
 */
export interface Tally {
  yes: number;
  no: number;
  abstain: number;
}

export function tallyOf(aggregate: Aggregate): Tally | null {
  if (!aggregate.decisive) return null;
  const { for: yes, against: no, abstain } = aggregate.decisive;
  return { yes, no, abstain };
}

/**
 * May a session be closed now? Closing early would cut voting short — an
 * attacker could stack a tally and slam the door — so a session only closes
 * once the window has elapsed, or once every eligible member has already
 * spoken (nothing left to wait for). Returns the refusal reason, or null.
 */
export function closeRefusal(params: {
  now: Date;
  closesAt: Date;
  votesCast: number;
  eligibleCount: number;
}): string | null {
  if (params.now >= params.closesAt) return null;
  if (params.eligibleCount > 0 && params.votesCast >= params.eligibleCount) return null;
  return `voting window is open until ${params.closesAt.toISOString()} and only ${params.votesCast} of ${params.eligibleCount} eligible members have voted`;
}

export interface Decision {
  outcome: SessionOutcome;
  /** Ranking methods: the option that won, once quorum is met. */
  winningOptionKey: string | null;
}

/**
 * Decide a session's outcome from its aggregate and the rules snapshotted at
 * open.
 *
 * Quorum is the one universal test — enough of the eligible weight has to turn
 * up, whatever the method. After that the two kinds part ways:
 *
 * A `decision` measures a threshold over the weight that took a side. Abstain
 * counts toward quorum (the member showed up) but not toward the threshold (it
 * is neither a yes nor a no). Consent is a decision whose against-side is any
 * objection at all, so one objection of any weight rejects — that is the method
 * working, not a rounding error.
 *
 * A `ranking` has no against-side to measure. Once quorum is met the ordering
 * is the result, and the top option wins. Imposing a majority threshold here
 * would reject the winner of nearly every genuine multi-option vote, which
 * looks like rigour and is actually a broken instrument.
 */
export function decideOutcome(params: {
  aggregate: Aggregate;
  threshold: VoteThreshold;
  quorumPercent: number;
  eligibleWeight: number;
}): Decision {
  const { aggregate: agg, threshold, quorumPercent, eligibleWeight } = params;
  const none: Decision = { outcome: SessionOutcome.EXPIRED, winningOptionKey: null };

  const quorumWeight = (quorumPercent / 100) * eligibleWeight;
  if (eligibleWeight <= 0 || agg.castWeight < quorumWeight) return none;

  if (agg.kind === "ranking") {
    const top = agg.ranked?.[0];
    if (!top || top.score <= 0) return none;
    return { outcome: SessionOutcome.APPROVED, winningOptionKey: top.key };
  }

  const d = agg.decisive;
  if (!d) return none;

  // Consent: any objection stops it, regardless of weight behind the objection.
  if (agg.method === "consent") {
    const objected = (agg.objections?.length ?? 0) > 0;
    if (objected) return { outcome: SessionOutcome.REJECTED, winningOptionKey: null };
    return d.for > 0 ? { outcome: SessionOutcome.APPROVED, winningOptionKey: null } : none;
  }

  const decisive = d.for + d.against;
  if (decisive === 0) return none;

  const passes =
    threshold === VoteThreshold.SUPERMAJORITY
      ? d.for / decisive >= SUPERMAJORITY_FRACTION
      : d.for > d.against;
  return {
    outcome: passes ? SessionOutcome.APPROVED : SessionOutcome.REJECTED,
    winningOptionKey: null,
  };
}
