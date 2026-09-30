/**
 * How the system's own values read to a person. Pages used to print them as
 * stored — "SIMPLE_MAJORITY · quorum 50% · electorate ALL_MEMBERS", "OPEN",
 * "treasury spend" — which only someone who read the code could follow. Every
 * page that shows one of these values takes its words from here (category
 * names from CATEGORY_LABEL in config/governance), so the vocabulary is one
 * list and changes in one place.
 */
import { SUPERMAJORITY_FRACTION } from "@/lib/config/governance";
import type {
  Electorate,
  ProposalStatus,
  SessionOutcome,
  SessionStatus,
  VoteThreshold,
} from "@/lib/db/enums";

/** Where a proposal stands, from its status and, once voted on, how it ended. */
export function proposalStanding(
  status: ProposalStatus | SessionStatus,
  outcome?: SessionOutcome | null,
): string {
  if (outcome === "APPROVED") return "Agreed";
  if (outcome === "REJECTED") return "Turned down";
  if (outcome === "EXPIRED") return "Ended without enough votes";
  if (status === "DRAFT") return "Draft, not voted on yet";
  if (status === "OPEN" || status === "ACTIVE") return "Voting now";
  return "Voting has ended";
}

const fraction = (f: number) =>
  Math.abs(f - 2 / 3) < 1e-9 ? "two thirds" : `${Math.round(f * 100)}%`;

/** The rules of one vote in a sentence: who votes, how many must take part, how many must agree. */
export function votingRules(rules: {
  threshold: VoteThreshold;
  quorumPercent: number;
  electorate: Electorate;
}): string {
  const who =
    rules.electorate === "HUMANS_ONLY" ? "Only people vote, not AI agents" : "All members vote";
  const turnout = `at least ${rules.quorumPercent}% of them must take part`;
  const agree =
    rules.threshold === "SUPERMAJORITY"
      ? `${fraction(SUPERMAJORITY_FRACTION)} must agree`
      : "more than half must agree";
  return `${who}; ${turnout}, and ${agree}.`;
}
