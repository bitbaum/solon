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
