import { z } from "zod";
import { contentHashOf } from "@/lib/domain/canonical";

/**
 * The bounds half of contribution allocation: what an organization may decide
 * about how its members split their contributions.
 *
 * Everything here is pure. The policy is JSON that arrived through a vote, so
 * it is never trusted on read — `parseContributionPolicy` is the only way in,
 * and the refinements below are the reason a stored policy can be handed to
 * the UI without a second round of defensive checks.
 */

/** One tier of government a contribution can be directed to. */
export const tierSchema = z.object({
  /**
   * Lowercase slug, for the same reason ballot options use one: this key is
   * written into the text a member signs. `split:federal=25` is something a
   * person can read back and check; a uuid is something they have to trust.
   */
  key: z
    .string()
    .regex(/^[a-z0-9][a-z0-9-]{0,31}$/, "tier keys are lowercase slugs, max 32 chars"),
  label: z.string().min(1).max(60),
  /** One line telling a person which government this actually is. */
  description: z.string().min(1).max(200).optional(),
  /** Floor: the least of their contribution a member may direct here. */
  minPercent: z.number().int().min(0).max(100),
  /** Ceiling: the most they may direct here. */
  maxPercent: z.number().int().min(0).max(100),
});
export type ContributionTier = z.infer<typeof tierSchema>;

/** A split: whole percentage points per tier key. */
export const splitsSchema = z.record(z.string(), z.number().int().min(0).max(100));
export type Splits = z.infer<typeof splitsSchema>;

export const TOTAL_PERCENT = 100;
const MIN_TIERS = 2;
const MAX_TIERS = 8;

/**
 * The policy in force, validated.
 *
 * The refinements are the substance of this module. A bounds policy can be
 * incoherent in ways that are not obvious from any single field — floors that
 * together exceed a whole contribution, ceilings that together cannot fill
 * one, a stated fallback that violates the very bounds it sits beside. Each of
 * those describes a rule under which *no* member could file a valid split, and
 * a rule nobody can obey is not a strict rule, it is a broken one. Rejecting
 * them here means the failure surfaces on the proposal, while it is still an
 * argument between people, rather than on every member's declaration after it
 * has already been enacted.
 */
export const contributionPolicySchema = z
  .object({
    tiers: tierSchema
      .array()
      .min(MIN_TIERS, "a split needs at least two tiers to be a split")
      .max(MAX_TIERS, `more than ${MAX_TIERS} tiers is a budget, not a split`),
    /** Applied to a member who has not declared. Published, never implicit. */
    fallback: splitsSchema,
  })
  .refine(
    (p) => new Set(p.tiers.map((t) => t.key)).size === p.tiers.length,
    "tier keys must be unique",
  )
  .refine(
    (p) => p.tiers.every((t) => t.minPercent <= t.maxPercent),
    "a tier's floor cannot exceed its ceiling",
  )
  .refine(
    (p) => p.tiers.reduce((s, t) => s + t.minPercent, 0) <= TOTAL_PERCENT,
    "the floors add up to more than a whole contribution — no split could satisfy them",
  )
  .refine(
    (p) => p.tiers.reduce((s, t) => s + t.maxPercent, 0) >= TOTAL_PERCENT,
    "the ceilings add up to less than a whole contribution — no split could fill it",
  )
  .refine(
    (p) => splitViolations(p.fallback, p.tiers).length === 0,
    "the fallback split does not satisfy the policy's own bounds",
  );

export type ContributionPolicy = z.infer<typeof contributionPolicySchema>;

/**
 * Read a stored policy. Returns null rather than throwing: a policy row that
 * fails to parse means the organization's enacted content is not usable, and
 * the caller has to say so out loud rather than substitute something.
 */
export function parseContributionPolicy(raw: unknown): ContributionPolicy | null {
  const parsed = contributionPolicySchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/**
 * Every way a split fails its policy, all at once.
 *
 * Returning the whole list rather than the first failure is a deliberate
 * courtesy: a member adjusting three numbers to add to a hundred should not
 * have to discover their problems one submission at a time.
 */
export function splitViolations(splits: Splits, tiers: ContributionTier[]): string[] {
  const problems: string[] = [];
  const known = new Set(tiers.map((t) => t.key));

  for (const key of Object.keys(splits)) {
    if (!known.has(key)) problems.push(`"${key}" is not a tier in the policy in force`);
  }
  for (const tier of tiers) {
    const value = splits[tier.key];
    if (value === undefined) {
      // Silence is not zero. A member who omits a tier may mean "nothing
      // there" or may not have seen it; guessing turns an omission into a
      // signed statement they never made.
      problems.push(`${tier.label} is missing — state it explicitly, zero included`);
      continue;
    }
    if (!Number.isInteger(value) || value < 0 || value > TOTAL_PERCENT) {
      problems.push(`${tier.label} must be a whole number of percentage points`);
      continue;
    }
    if (value < tier.minPercent) {
      problems.push(`${tier.label} is below its floor of ${tier.minPercent}%`);
    }
    if (value > tier.maxPercent) {
      problems.push(`${tier.label} is above its ceiling of ${tier.maxPercent}%`);
    }
  }

  const total = Object.values(splits).reduce((s, n) => s + (Number.isFinite(n) ? n : 0), 0);
  if (total !== TOTAL_PERCENT) {
    problems.push(`the split adds up to ${total}%, and a whole contribution is ${TOTAL_PERCENT}%`);
  }
  return problems;
}

/** Does this split satisfy these bounds? */
export function splitSatisfies(splits: Splits, tiers: ContributionTier[]): boolean {
  return splitViolations(splits, tiers).length === 0;
}

/**
 * The canonical encoding of a split, written verbatim into the signed message.
 *
 * Sorted by key, and — unlike a dot ballot — **zeros are kept**. Directing
 * nothing to a tier is a position, often the whole point of declaring at all,
 * and a canonical form that dropped it would let `federal=0` and "I forgot
 * about federal" sign identical text.
 */
export function canonicalSplit(splits: Splits): string {
  return Object.entries(splits)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, percent]) => `${key}=${percent}`)
    .join(",");
}

/** sha256 of the canonical JSON of a split — bound into the signed message. */
export function splitHash(splits: Splits): string {
  return contentHashOf(splits);
}

/**
 * An even split across the tiers, with the remainder going to the tiers
 * nearest the person paying. Used as the starting position in the declaration
 * form — a form that opens on a valid split rather than on zeros, so the first
 * thing a member sees is something they could sign.
 *
 * Floors are honoured first; only what is left over is spread. Returns null if
 * the tiers admit no even-ish split at all, which the policy schema already
 * makes unreachable for a stored policy.
 */
export function evenSplit(tiers: ContributionTier[]): Splits | null {
  const floors = tiers.reduce((s, t) => s + t.minPercent, 0);
  if (floors > TOTAL_PERCENT) return null;

  const splits: Splits = Object.fromEntries(tiers.map((t) => [t.key, t.minPercent]));
  let remaining = TOTAL_PERCENT - floors;

  // Round-robin a point at a time rather than dividing: it lands on the
  // ceilings exactly, spends every last point, and needs no rounding rule.
  let moved = true;
  while (remaining > 0 && moved) {
    moved = false;
    for (const tier of tiers) {
      if (remaining === 0) break;
      if ((splits[tier.key] ?? 0) >= tier.maxPercent) continue;
      splits[tier.key] = (splits[tier.key] ?? 0) + 1;
      remaining -= 1;
      moved = true;
    }
  }
  return remaining === 0 ? splits : null;
}
