/**
 * Was a change to the constitution decided, or merely merged?
 *
 * `governance.ts` says of itself: "Changing this file IS a GOVERNANCE_RULES
 * matter (humans-only)." Until now that sentence was a comment. Loki holds the
 * deploy key for Solon, so the engineering plane could change the rules that
 * govern it and the only defence was a reviewer reading the diff.
 *
 * This module is the check behind the sentence — and it RECORDS, it does not
 * block. A merge that changes the rules without a decision behind it still
 * merges; what changes is that CI says so, in the PR, with a one-click link to
 * the proposal that ratifies it. Prevention is impossible (someone holds the
 * key) and blocking is a dead end (nobody should be stuck in CI over a
 * governance question). Verifiability is the honest answer, and this makes it
 * machine-checked rather than aspirational.
 *
 * Pure: the CI script feeds it commit messages and a fetched decision document
 * and prints what it returns. Nothing here reads git, the network or the DB.
 */

import { verifyMessage } from "@/lib/bitcoin/message";
import { DecisionCategory, SessionOutcome } from "@/lib/db/enums";
import type { DecisionDocument } from "@/lib/domain/decision";
import { proposeHref, TITLE_MAX } from "@/lib/domain/proposal-draft";

/** The files whose change is, by the rules' own words, a rules change. */
export const CONSTITUTION_PATHS = ["src/lib/config/governance.ts"] as const;

export function touchesConstitution(changedPaths: readonly string[]): boolean {
  return changedPaths.some((p) => (CONSTITUTION_PATHS as readonly string[]).includes(p));
}

/**
 * `Decision: <voting session id>` trailers, one per line, anywhere in a commit
 * message. Case-insensitive on the key; the id is taken verbatim and trimmed.
 * Duplicates collapse — the same decision cited by three commits is one claim.
 */
export function decisionTrailers(commitMessages: readonly string[]): string[] {
  const ids = new Set<string>();
  for (const message of commitMessages) {
    for (const line of message.split(/\r?\n/)) {
      const m = /^\s*decision\s*:\s*(\S+)\s*$/i.exec(line);
      if (m) ids.add(m[1]);
    }
  }
  return [...ids];
}

export type Assessment = { ratified: true } | { ratified: false; reason: string };

/**
 * Does this decision document ratify a rules change? Four things must hold,
 * and every one is recomputed from the document rather than read as a claim:
 * the right category, an approved outcome, a proposer signature that verifies,
 * and a vote set whose every signature verifies against its member's address.
 *
 * This is the same "evidence, not authority" stance OrangeCat takes toward
 * Solon: the endpoint publishes the record; the consumer recounts it.
 */
export function assessDecision(doc: DecisionDocument): Assessment {
  if (doc.proposal.category !== DecisionCategory.GOVERNANCE_RULES) {
    return {
      ratified: false,
      reason: `decision ${doc.decision_id} is a ${doc.proposal.category} decision, not GOVERNANCE_RULES`,
    };
  }
  if (doc.outcome !== SessionOutcome.APPROVED) {
    return {
      ratified: false,
      reason: `decision ${doc.decision_id} was ${doc.outcome}, not approved`,
    };
  }
  const proposer = verifyMessage(
    doc.proposal.proposerMessage,
    doc.proposal.proposer.bitcoinAddress,
    doc.proposal.proposerSignature,
  );
  if (!proposer.valid) {
    return { ratified: false, reason: `proposer signature does not verify: ${proposer.reason}` };
  }
  for (const vote of doc.votes) {
    const v = verifyMessage(vote.signedMessage, vote.member.bitcoinAddress, vote.signature);
    if (!v.valid) {
      return {
        ratified: false,
        reason: `vote by ${vote.member.displayName} does not verify: ${v.reason}`,
      };
    }
  }
  return { ratified: true };
}

/**
 * The one-click way forward when a rules change has no decision behind it: a
 * link to the proposal form with the ratification already written — title,
 * category, and a body that names the change so voters can read the diff.
 */
export function ratificationHref(change: { subject: string; url: string }): string {
  return proposeHref({
    category: DecisionCategory.GOVERNANCE_RULES,
    title: `Ratify: ${change.subject}`.slice(0, TITLE_MAX),
    body: `This change to the governance rules was merged without a prior decision.\n\nChange: ${change.url}\n\nApproving this proposal ratifies it; rejecting it is the signal to revert.`,
  });
}

/**
 * One line per finding for a job summary or a PR comment. Kept here so the
 * script prints and never composes — the words a reviewer reads are tested.
 */
export function report(input: {
  changedConstitution: boolean;
  claims: Array<{ id: string; assessment: Assessment | { ratified: false; reason: string } }>;
  ratifyHref: string;
}): { level: "none" | "notice" | "warning"; lines: string[] } {
  if (!input.changedConstitution) return { level: "none", lines: [] };
  const ratified = input.claims.filter((c) => c.assessment.ratified);
  if (ratified.length > 0) {
    return {
      level: "notice",
      lines: [
        `Governance rules change is ratified by decision ${ratified.map((c) => c.id).join(", ")}.`,
      ],
    };
  }
  const lines = ["This PR changes the governance rules and no decision ratifies it yet."];
  for (const c of input.claims) {
    if (!c.assessment.ratified) lines.push(`Decision ${c.id}: ${c.assessment.reason}`);
  }
  lines.push(
    "It can still merge. Put it to a vote so the record shows it was decided, not just merged:",
    input.ratifyHref,
    "Once it passes, add `Decision: <session id>` to a commit message on this branch.",
  );
  return { level: "warning", lines };
}
