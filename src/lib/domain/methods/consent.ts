import { z } from "zod";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import type { Aggregate, MethodSpec, WeightedBallot } from "./types";

export interface ConsentBallot {
  response: "agree" | "abstain" | "object";
  rationale?: string | null;
}

/**
 * Bound into the signed text so an objection's stated reason cannot be edited.
 * Uses @noble/hashes rather than node:crypto because the voter's browser has to
 * compute the identical digest to show them what they are about to sign.
 */
function rationaleDigest(rationale: string): string {
  return bytesToHex(sha256(new TextEncoder().encode(rationale.trim()))).slice(0, 16);
}

/**
 * Sociocratic consent: the question is not "who is in favour?" but "does anyone
 * have a reasoned objection?". One objection stops the proposal regardless of
 * weight, which is the entire point — consent asks whether anyone can see harm
 * the group has missed, and you cannot outvote that with numbers.
 *
 * The rationale is bound into the signature by its digest rather than its full
 * text: an objection whose reason could be rewritten in transit is not an
 * objection, it is a rumour. The reason is stored in full and shown; the digest
 * proves it is the one that was signed.
 */
export const consent: MethodSpec<ConsentBallot> = {
  id: "consent",
  kind: "decision",
  label: "Consent",
  summary:
    "Agree, abstain, or object with a reason. Any single reasoned objection stops the proposal — consent asks whether anyone sees harm, not who has the most votes.",
  needsOptions: false,

  schema: () =>
    z
      .object({
        response: z.enum(["agree", "abstain", "object"]),
        rationale: z.string().trim().min(1).max(2000).nullish(),
      })
      .refine((b) => b.response !== "object" || !!b.rationale, {
        message: "an objection must say why — that reason is what the group has to resolve",
        path: ["rationale"],
      }),

  canonical: (b) =>
    b.response === "object" ? `object:${rationaleDigest(b.rationale ?? "")}` : b.response,

  aggregate(ballots: WeightedBallot<ConsentBallot>[]): Aggregate {
    const decisive = { for: 0, against: 0, abstain: 0 };
    const objections = [];
    for (const { ballot, weight } of ballots) {
      if (ballot.response === "agree") decisive.for += weight;
      else if (ballot.response === "object") {
        decisive.against += weight;
        objections.push({ rationale: ballot.rationale ?? null, weight });
      } else decisive.abstain += weight;
    }
    return {
      method: "consent",
      kind: "decision",
      castWeight: decisive.for + decisive.against + decisive.abstain,
      ballotCount: ballots.length,
      decisive,
      objections,
    };
  },
};
