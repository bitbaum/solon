import { z } from "zod";
import { contentHashOf } from "./canonical";

/**
 * The originator-share rule: value routing by default, not by favour.
 *
 * "Anyone can join the cat or steal the cat" only pays the originator if the
 * system routes something back without anyone having to remember to. This
 * policy is that rule, as a versioned Solon artifact: a fixed share of a
 * product's net revenue goes to the originators of the code it is built from
 * — the repository itself and every shared package it adopts — split equally
 * per originator. Who originated what is not typed here; it is read from the
 * fleet's origin register, which is derived nightly from proofs nobody here
 * controls.
 *
 * v1 is the seeded bootstrap version (drizzle/0002_seed_originator_share.sql),
 * exactly like allocation_policy v1. Every later version requires an APPROVED
 * voting session, and ALLOCATION_POLICY is the category that governs it.
 *
 * The economic layer (OrangeCat) is what moves money; this module only says
 * how much goes where, deterministically, in integer satoshis, so that the
 * ledger it produces can be recounted by anyone from the same inputs.
 */

export const ORIGINATOR_SHARE_POLICY_KEY = "originator_share";

export const OriginatorSharePolicySchema = z.object({
  /** Share of net revenue routed to originators, in basis points (1000 = 10%). */
  share_bps: z.number().int().min(0).max(10000),
  /** What the share is taken from. v1: net revenue of the product, per product. */
  base: z.literal("net_revenue"),
  beneficiaries: z.object({
    /** Where "who originated what" is read from. Never typed into a policy. */
    register: z.string().url(),
    /** Prose the machine does not read but the voter does. */
    rule: z.string().min(1),
    weighting: z.literal("equal_per_originator"),
  }),
  settlement: z.object({
    cadence: z.enum(["monthly", "quarterly"]),
    currency: z.literal("BTC"),
    ledger: z.literal("public"),
  }),
  /** A payout below this stays in the pool for next time; dust helps nobody. */
  minimum_payout_sats: z.number().int().min(0),
});

export type OriginatorSharePolicy = z.infer<typeof OriginatorSharePolicySchema>;

/** The bootstrap version, byte-for-byte what 0002_seed_originator_share.sql stores. */
export const ORIGINATOR_SHARE_V1: OriginatorSharePolicy = {
  share_bps: 1000,
  base: "net_revenue",
  beneficiaries: {
    register: "https://raw.githubusercontent.com/bitbaum/fleet/main/registers/origin.json",
    rule: "the originators of the product's repository and of every shared package it adopts (fleet registers/packages.json adopters); an originator is the first-commit author recorded in the origin register",
    weighting: "equal_per_originator",
  },
  settlement: { cadence: "monthly", currency: "BTC", ledger: "public" },
  minimum_payout_sats: 10_000,
};

export function parseOriginatorSharePolicy(content: unknown): OriginatorSharePolicy {
  return OriginatorSharePolicySchema.parse(content);
}

export interface OriginatorShareSplit {
  /** share_bps of the base, floored to whole satoshis. */
  poolSats: number;
  /** Per originator, equal shares, floored. Empty when there are no originators. */
  payouts: Record<string, number>;
  /** What the floor left over, plus any payout under the minimum. Stays in the pool. */
  carrySats: number;
}

/**
 * Split one settlement period's net revenue under a policy. Pure and
 * integer-only: the same inputs always produce the same ledger lines, so a
 * beneficiary can recount their line from the public numbers.
 *
 * Originators are de-duplicated: one person who originated three of the
 * product's dependencies is one originator, not three — the weighting is per
 * originator, not per repository, on purpose. A repository count would reward
 * splitting work into many small packages.
 */
export function splitOriginatorShare(
  netRevenueSats: number,
  originators: readonly string[],
  policy: OriginatorSharePolicy = ORIGINATOR_SHARE_V1,
): OriginatorShareSplit {
  if (!Number.isInteger(netRevenueSats) || netRevenueSats < 0) {
    throw new Error("netRevenueSats must be a non-negative integer number of satoshis");
  }
  const poolSats = Math.floor((netRevenueSats * policy.share_bps) / 10_000);
  const who = [...new Set(originators.map((o) => o.trim()).filter(Boolean))].sort();
  if (who.length === 0) return { poolSats, payouts: {}, carrySats: poolSats };
  const each = Math.floor(poolSats / who.length);
  const payouts: Record<string, number> = {};
  let paid = 0;
  for (const o of who) {
    if (each >= policy.minimum_payout_sats && each > 0) {
      payouts[o] = each;
      paid += each;
    }
  }
  return { poolSats, payouts, carrySats: poolSats - paid };
}

/** The hash voters sign over for this content — what OrangeCat re-derives. */
export function originatorShareContentHash(
  policy: OriginatorSharePolicy = ORIGINATOR_SHARE_V1,
): string {
  return contentHashOf(policy);
}
