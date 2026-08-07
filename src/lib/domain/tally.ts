import { VoteChoice, VoteThreshold, SessionOutcome } from "@prisma/client";
import { SUPERMAJORITY_FRACTION } from "@/lib/config/governance";

export interface WeightedVote {
  choice: VoteChoice;
  weight: number;
}

export interface Tally {
  yes: number;
  no: number;
  abstain: number;
}

/** Weighted tally over already-verified votes. Pure — no DB, fully testable. */
export function tally(votes: WeightedVote[]): Tally {
  const t: Tally = { yes: 0, no: 0, abstain: 0 };
  for (const v of votes) {
    if (v.choice === VoteChoice.YES) t.yes += v.weight;
    else if (v.choice === VoteChoice.NO) t.no += v.weight;
    else t.abstain += v.weight;
  }
  return t;
}

/**
 * Decide a session outcome from its tally and the rules snapshotted at open.
 * Abstain counts toward quorum (the member showed up) but not toward the
 * threshold (it is not a yes and not a no).
 */
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

export function decideOutcome(params: {
  tally: Tally;
  threshold: VoteThreshold;
  quorumPercent: number;
  eligibleWeight: number;
}): SessionOutcome {
  const { tally: t, threshold, quorumPercent, eligibleWeight } = params;
  const cast = t.yes + t.no + t.abstain;
  const quorumWeight = (quorumPercent / 100) * eligibleWeight;
  if (eligibleWeight <= 0 || cast < quorumWeight) return SessionOutcome.EXPIRED;

  const decisive = t.yes + t.no;
  if (decisive === 0) return SessionOutcome.EXPIRED;

  const passes =
    threshold === VoteThreshold.SUPERMAJORITY
      ? t.yes / decisive >= SUPERMAJORITY_FRACTION
      : t.yes > t.no;
  return passes ? SessionOutcome.APPROVED : SessionOutcome.REJECTED;
}
