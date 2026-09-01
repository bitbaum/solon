import { DecisionCategory, Electorate, VoteThreshold } from "@/lib/db/enums";

/**
 * SSOT for who decides what, and how.
 *
 * Agents (the Cat, FleetCrown's agents) are full members: they may PROPOSE in
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
