import { DecisionCategory, Electorate, VoteThreshold } from "@/lib/db/enums";

/**
 * SSOT for who decides what, and how.
 *
 * Agents (the Cat, Loki's agents) are full members: they may PROPOSE in
 * any category, and they VOTE wherever the electorate is ALL_MEMBERS. The
 * HUMANS_ONLY categories are the red lines from the OC↔Solon spec: money
 * moving to people, membership, safety — and GOVERNANCE_RULES itself, so
 * agents can never vote to expand their own suffrage.
 *
 * Changing this file IS a GOVERNANCE_RULES matter (humans-only). Sessions
 * snapshot these values at open, so edits here never rewrite a past decision.
 */
export const CATEGORY_ELECTORATE: Record<DecisionCategory, Electorate> = {
  ALLOCATION_POLICY: Electorate.ALL_MEMBERS,
  TREASURY_SPEND: Electorate.ALL_MEMBERS,
  OPERATIONS: Electorate.ALL_MEMBERS,
  AID_DISBURSEMENT: Electorate.HUMANS_ONLY,
  MEMBERSHIP: Electorate.HUMANS_ONLY,
  SAFETY: Electorate.HUMANS_ONLY,
  GOVERNANCE_RULES: Electorate.HUMANS_ONLY,
};

export const CATEGORY_THRESHOLD: Record<DecisionCategory, VoteThreshold> = {
  ALLOCATION_POLICY: VoteThreshold.SIMPLE_MAJORITY,
  TREASURY_SPEND: VoteThreshold.SIMPLE_MAJORITY,
  OPERATIONS: VoteThreshold.SIMPLE_MAJORITY,
  AID_DISBURSEMENT: VoteThreshold.SIMPLE_MAJORITY,
  MEMBERSHIP: VoteThreshold.SUPERMAJORITY,
  SAFETY: VoteThreshold.SUPERMAJORITY,
  GOVERNANCE_RULES: VoteThreshold.SUPERMAJORITY,
};

/** Percent of eligible weight that must vote for the session to be decisive. */
export const CATEGORY_QUORUM_PERCENT: Record<DecisionCategory, number> = {
  ALLOCATION_POLICY: 50,
  TREASURY_SPEND: 50,
  OPERATIONS: 30,
  AID_DISBURSEMENT: 50,
  MEMBERSHIP: 50,
  SAFETY: 50,
  GOVERNANCE_RULES: 60,
};

export const VOTING_WINDOW_DAYS = 7;

/** SUPERMAJORITY means at least this fraction of yes among yes+no. */
export const SUPERMAJORITY_FRACTION = 2 / 3;

/**
 * Human-readable names for the categories, and what each one actually covers.
 *
 * These live here, beside the rules they name, because the label and the rule
 * are the same fact seen twice: a page that renders "Aid disbursement — humans
 * only" is reading one row, not joining two lists that can drift. This map was
 * a private copy inside the ecosystem page until /governance needed it too.
 */
export const CATEGORY_LABEL: Record<DecisionCategory, string> = {
  ALLOCATION_POLICY: "Allocation policy",
  TREASURY_SPEND: "Treasury spend",
  OPERATIONS: "Operations",
  AID_DISBURSEMENT: "Aid disbursement",
  MEMBERSHIP: "Membership",
  SAFETY: "Safety",
  GOVERNANCE_RULES: "Governance rules",
};

export const CATEGORY_MEANING: Record<DecisionCategory, string> = {
  ALLOCATION_POLICY:
    "The standing rule for how value is divided, decided before anyone asks for a share of it.",
  TREASURY_SPEND: "Moving funds out of the treasury for a named purpose.",
  OPERATIONS:
    "The ordinary running of the organization — the decisions that have to be cheap to make.",
  AID_DISBURSEMENT: "Money reaching a person.",
  MEMBERSHIP: "Who joins the roster, and who leaves it.",
  SAFETY: "Anything bearing on the safety of people.",
  GOVERNANCE_RULES: "The rules themselves — including this table.",
};
