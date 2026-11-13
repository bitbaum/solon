/**
 * What Solon can do, and whether it does it today — the one place that says so.
 *
 * Every page that promises something reads its status from here, so the site
 * cannot describe as built what is only planned (the fleet rule: nothing is
 * claimed that nobody can back). Moving a capability to "available" is a
 * one-line change in the same PR that ships it.
 *
 * Names and descriptions live in messages `Capabilities.<key>`.
 */
export type CapabilityStatus = "available" | "inDevelopment" | "planned";

export const CAPABILITIES = {
  founding: "available",
  proposalsAndVotes: "available",
  countingMethods: "available",
  ruleTemplates: "available",
  publicRecord: "available",
  signedVotes: "available",
  treasuryWatch: "available",
  languages: "available",
  governanceAgent: "inDevelopment",
  admissionByVote: "planned",
  charterByVote: "planned",
  mandates: "planned",
  bankLedger: "planned",
  passkeys: "planned",
  federation: "planned",
  exportAndFork: "planned",
} as const satisfies Record<string, CapabilityStatus>;

export type CapabilityKey = keyof typeof CAPABILITIES;

/**
 * What Solon does with laws and numbers for each place, as /statistics/why
 * names it. Its words live in `Statistics.why.items`, because that page is
 * translated and `Capabilities` is not yet. ROADMAP: `#stats-place-gaps`,
 * `#stats-timeline-markers`, `#stats-policy-by-trend` for the planned ones.
 */
export const DATA_CAPABILITIES = {
  lawByPlace: "available",
  statisticsSeries: "available",
  publicBudgets: "available",
  measurementGaps: "available",
  lawEvents: "available",
  aiResearch: "available",
  groupMeasures: "available",
  placeGapReport: "planned",
  trendMarkers: "planned",
  policyByTrend: "planned",
} as const satisfies Record<string, CapabilityStatus>;

export type DataCapabilityKey = keyof typeof DATA_CAPABILITIES;
