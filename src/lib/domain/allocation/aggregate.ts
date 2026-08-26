import {
  TOTAL_PERCENT,
  splitSatisfies,
  type ContributionPolicy,
  type ContributionTier,
  type Splits,
} from "./policy";

/**
 * Turning many individual splits into one organization-wide number.
 *
 * Pure, and separate from the policy rules on purpose: this is the part that
 * gets read as a headline figure — "the town directs 41% locally" — and a
 * headline figure that quietly papers over who actually said what is the
 * failure mode worth designing against.
 */

/** Where a member stands relative to the policy in force. */
export type Standing =
  /** Signed a split that satisfies the bounds in force. Counted as cast. */
  | "declared"
  /** Has never declared. Counted at the published fallback. */
  | "undeclared"
  /**
   * Declared under bounds that have since changed, and their split no longer
   * fits the current ones. Counted at the fallback, NOT clamped — see below.
   */
  | "out_of_bounds";

/** One member's position, as the aggregate needs it. */
export interface MemberAllocation {
  memberId: string;
  weight: number;
  /** Their active declaration, or null if they have never made one. */
  splits: Splits | null;
}

export interface TierShare {
  key: string;
  label: string;
  description?: string;
  /** Weighted share of contributions directed here, 0–100, unrounded. */
  percent: number;
  /**
   * The same share as whole points, adjusted so the tiers sum to exactly 100.
   * Use this for display: three tiers rounded independently can add to 99 or
   * 101, and a published split that does not add up invites the reader to
   * conclude the arithmetic is wrong rather than the rounding.
   */
  displayPercent: number;
  /**
   * The share among members who actually declared, ignoring the fallback.
   * Null when nobody has. This is the number that says what people *chose*,
   * as against what currently applies.
   */
  declaredPercent: number | null;
  floorPercent: number;
  ceilingPercent: number;
}

export interface AllocationAggregate {
  tiers: TierShare[];
  counts: {
    members: number;
    declared: number;
    undeclared: number;
    outOfBounds: number;
  };
  weights: {
    eligible: number;
    /** Weight behind a valid declaration. */
    declared: number;
    /** Weight counted at the fallback, for want of a valid declaration. */
    fallback: number;
  };
  /**
   * Share of the eligible weight that is somebody's stated choice rather than
   * the fallback, 0–100. Read the headline split next to this: at 4% it is
   * mostly a report of the default, and saying so is the whole job.
   */
  declaredWeightPercent: number;
}

/**
 * How one member is being counted, and why.
 *
 * `out_of_bounds` is the case worth stating plainly. When a vote narrows the
 * bounds, a split someone signed under the old ones can stop fitting. Solon
 * will not clamp it into range: the number they signed is the only number they
 * ever asserted, and a clamped version is a statement they did not make, still
 * carrying their signature. So the declaration stands untouched on the record,
 * it stops being counted, and the member is counted at the published fallback
 * until they sign a split under the rules that now apply.
 */
export function standingOf(member: MemberAllocation, tiers: ContributionTier[]): Standing {
  if (member.splits === null) return "undeclared";
  return splitSatisfies(member.splits, tiers) ? "declared" : "out_of_bounds";
}

/**
 * Round exact shares to whole points that still sum to 100 (largest
 * remainder): floor everything, then hand the leftover points to the tiers
 * with the largest fractional parts, ties broken by key so the same input
 * always renders the same way.
 */
export function roundToWhole(exact: { key: string; percent: number }[]): Map<string, number> {
  const floored = exact.map((e) => ({
    key: e.key,
    whole: Math.floor(e.percent),
    remainder: e.percent - Math.floor(e.percent),
  }));
  const spare = TOTAL_PERCENT - floored.reduce((s, f) => s + f.whole, 0);

  const order = [...floored].sort(
    (a, b) => b.remainder - a.remainder || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0),
  );
  for (let i = 0; i < spare && i < order.length; i += 1) order[i].whole += 1;

  return new Map(floored.map((f) => [f.key, f.whole]));
}

/** Weighted mean split over a set of (split, weight) pairs. Null if no weight. */
function weightedShares(
  entries: { splits: Splits; weight: number }[],
  tiers: ContributionTier[],
): Map<string, number> | null {
  const total = entries.reduce((s, e) => s + e.weight, 0);
  if (total <= 0) return null;

  const shares = new Map(tiers.map((t) => [t.key, 0]));
  for (const { splits, weight } of entries) {
    for (const tier of tiers) {
      shares.set(tier.key, (shares.get(tier.key) ?? 0) + (splits[tier.key] ?? 0) * weight);
    }
  }
  for (const [key, value] of shares) shares.set(key, value / total);
  return shares;
}

/**
 * The organization's effective contribution split.
 *
 * Every eligible member counts, at their voting weight: those with a valid
 * declaration at what they declared, everyone else at the published fallback.
 * Counting only the members who declared would report a number that no
 * contribution actually follows, which is the more flattering figure and the
 * wrong one.
 */
export function aggregateAllocations(
  members: MemberAllocation[],
  policy: ContributionPolicy,
): AllocationAggregate {
  const { tiers, fallback } = policy;

  const counts = { members: members.length, declared: 0, undeclared: 0, outOfBounds: 0 };
  const weights = { eligible: 0, declared: 0, fallback: 0 };
  const effective: { splits: Splits; weight: number }[] = [];
  const declaredOnly: { splits: Splits; weight: number }[] = [];

  for (const member of members) {
    const weight = Number.isFinite(member.weight) && member.weight > 0 ? member.weight : 0;
    weights.eligible += weight;

    const standing = standingOf(member, tiers);
    if (standing === "declared") counts.declared += 1;
    else if (standing === "undeclared") counts.undeclared += 1;
    else counts.outOfBounds += 1;

    if (standing === "declared" && member.splits) {
      weights.declared += weight;
      effective.push({ splits: member.splits, weight });
      declaredOnly.push({ splits: member.splits, weight });
    } else {
      weights.fallback += weight;
      effective.push({ splits: fallback, weight });
    }
  }

  // With no eligible weight there is no population to average, and the
  // fallback is exactly what would apply to the next member through the door.
  const shares = weightedShares(effective, tiers) ?? new Map(tiers.map((t) => [t.key, fallback[t.key] ?? 0]));
  const declaredShares = weightedShares(declaredOnly, tiers);

  const whole = roundToWhole(tiers.map((t) => ({ key: t.key, percent: shares.get(t.key) ?? 0 })));

  return {
    tiers: tiers.map((tier) => ({
      key: tier.key,
      label: tier.label,
      ...(tier.description ? { description: tier.description } : {}),
      percent: shares.get(tier.key) ?? 0,
      displayPercent: whole.get(tier.key) ?? 0,
      declaredPercent: declaredShares ? (declaredShares.get(tier.key) ?? 0) : null,
      floorPercent: tier.minPercent,
      ceilingPercent: tier.maxPercent,
    })),
    counts,
    weights,
    declaredWeightPercent:
      weights.eligible > 0 ? (weights.declared / weights.eligible) * TOTAL_PERCENT : 0,
  };
}
