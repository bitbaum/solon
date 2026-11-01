import { DecisionCategory, VoteThreshold } from "@/lib/db/enums";

/**
 * SSOT for who decides what, and how.
 *
 * Agents (the Cat, Loki's agents) are full members: they may PROPOSE in
 * any category, and they VOTE in every category their organization has not
 * made humans-only. Which categories those are is each organization's own
 * rule (`organizations.humans_only_categories`), not a platform rule: one
 * organization may let its agents vote on everything, another may close more
 * categories than this list does.
 *
 * This is the list every organization starts with, and it carries the
 * reasoning from the OC↔Solon spec: money moving to people, membership,
 * safety — and GOVERNANCE_RULES itself, so that agents cannot vote to expand
 * their own suffrage unless the people of that organization decide they may.
 *
 * An organization changes its own list with a GOVERNANCE_RULES decision (a
 * proposal carrying a `humans_only` effect — src/lib/domain/effects.ts),
 * voted under the list it already has; with this default, that vote is
 * humans-only. Changing this default changes only what organizations founded
 * afterwards start with, and is a GOVERNANCE_RULES matter for Solon itself.
 * Sessions snapshot their electorate at open, so no edit rewrites a past
 * decision.
 */
export const DEFAULT_HUMANS_ONLY_CATEGORIES = [
  DecisionCategory.AID_DISBURSEMENT,
  DecisionCategory.MEMBERSHIP,
  DecisionCategory.SAFETY,
  DecisionCategory.GOVERNANCE_RULES,
] as const satisfies readonly DecisionCategory[];

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
  ALLOCATION_POLICY: "How money is shared",
  TREASURY_SPEND: "Spending money",
  OPERATIONS: "Day-to-day running",
  AID_DISBURSEMENT: "Help for a person",
  MEMBERSHIP: "Who is a member",
  SAFETY: "Safety",
  GOVERNANCE_RULES: "The rules",
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
