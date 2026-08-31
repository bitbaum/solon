import { z } from "zod";

/**
 * A voting method is the shape of the question. Solon asks six of them.
 *
 * Each method owns three things that must never drift apart: what ballots it
 * admits (`schema`), how a ballot is written into the text a member signs
 * (`canonical`), and how ballots become a result (`aggregate`). Keeping them in
 * one module is what makes adding a method a one-file change instead of a
 * five-file archaeology exercise.
 */
export type MethodId = "single_choice" | "consent" | "approval" | "dot" | "score" | "ranked";

/**
 * Two kinds, and the difference decides how an outcome is read.
 *
 * A `decision` asks whether one thing should happen: it has a for-side and an
 * against-side, so a threshold (majority, supermajority) is meaningful.
 *
 * A `ranking` asks which of several things the organization prefers. There is
 * no "against" to measure a threshold against — the ordering *is* the result.
 * Applying a majority threshold to a five-way choice would reject the winner
 * of almost every real vote, which is a bug dressed as rigour.
 */
export type MethodKind = "decision" | "ranking";

/**
 * An answer on the ballot. `key` is a short human slug, not a uuid, because it
 * is written into the message the member signs — a voter must be able to read
 * what they are putting their key behind. `choice:dots:solar-roof=3` is
 * checkable by a human; `choice:dots:a3f21b8e-...=3` is a leap of faith.
 */
export const optionSchema = z.object({
  key: z
    .string()
    .regex(/^[a-z0-9][a-z0-9-]{0,31}$/, "option keys are lowercase slugs, max 32 chars"),
  label: z.string().min(1).max(120),
});
export type BallotOption = z.infer<typeof optionSchema>;

/** Options as a set: keys unique, at least two to be worth voting on. */
export const optionsSchema = optionSchema
  .array()
  .min(2, "a choice needs at least two options")
  .max(20, "more than twenty options is a shortlist problem, not a ballot problem")
  .refine(
    (opts) => new Set(opts.map((o) => o.key)).size === opts.length,
    "option keys must be unique",
  );

/** One member's ballot, already weighted by their voting weight. */
export interface WeightedBallot<B = unknown> {
  ballot: B;
  weight: number;
}

/** An option's standing in a ranking result. */
export interface RankedEntry {
  key: string;
  label: string;
  /** Method-specific magnitude: approvals, dots, mean score, or Borda points. */
  score: number;
  /** Share of the maximum this option could have scored, 0–100. */
  percent: number;
}

/** A stated objection under consent. Surfaced, never silently averaged away. */
export interface Objection {
  rationale: string | null;
  weight: number;
}

/**
 * The aggregate of a session's ballots. One shape for every method so quorum —
 * which is identical everywhere — is computed once, in one place.
 */
export interface Aggregate {
  method: MethodId;
  kind: MethodKind;
  /** Weight that cast any ballot. The only input to the quorum test. */
  castWeight: number;
  /** Number of ballots cast, for display and the close gate. */
  ballotCount: number;
  /** Decision methods: the sides a threshold is measured over. */
  decisive?: { for: number; against: number; abstain: number };
  /** Consent only: every objection, with its rationale intact. */
  objections?: Objection[];
  /** Ranking methods: the ordering, best first. */
  ranked?: RankedEntry[];
  /**
   * Ranked ballots only: the option that beats every other head-to-head, if one
   * exists. Reported alongside the Borda ordering because when the two disagree
   * the organization deserves to know before it acts, not after.
   */
  condorcetKey?: string | null;
}

/**
 * Everything a method is. `canonical` is the security-critical member: whatever
 * it returns is what the voter's signature actually covers, so any part of a
 * ballot it omits is a part an attacker can rewrite in transit while the
 * signature still verifies.
 */
export interface MethodSpec<B> {
  id: MethodId;
  kind: MethodKind;
  label: string;
  /** One sentence a voter reads before casting. */
  summary: string;
  /** Does this method need an option list, or is it inherently yes/no? */
  needsOptions: boolean;
  /** Ballot validator. Options are passed so it can reject unknown keys. */
  schema(options: BallotOption[]): z.ZodType<B>;
  /**
   * Deterministic, human-readable encoding of the ballot, written verbatim
   * into the signed message. Must be stable across runs and machines: sort
   * anything set-like, never depend on object key order.
   */
  canonical(ballot: B): string;
  aggregate(ballots: WeightedBallot<B>[], options: BallotOption[]): Aggregate;
}

/**
 * A method with its ballot type erased — what a heterogeneous registry can
 * hold. The `any` is deliberate and confined to this line: six specs with six
 * different ballot types cannot share a single parameterised type without it,
 * and every public entry point re-validates through `schema()` before the
 * ballot is touched, so nothing downstream trusts this erasure.
 */
export type AnyMethodSpec = MethodSpec<any>;
