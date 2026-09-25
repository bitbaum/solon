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
