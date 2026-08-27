/**
 * SSOT for the three-pillar stack Solon belongs to.
 *
 * OrangeCat is the economic pillar, FleetCrown the engineering pillar, Solon
 * the governance pillar. Every claim in `tie` is verifiable against running
 * systems — the live org in this database, the sibling products' public
 * sites, or this repo's own deploy workflow — so keep it that way: nothing
 * goes in here that a reader cannot check.
 */

export interface EcosystemPillar {
  key: "orangecat" | "fleetcrown" | "solon";
  name: string;
  role: string;
  url: string;
  description: string;
  /** The real, checkable relationship between this pillar and Solon. */
  tie: string;
}

export const ECOSYSTEM_PILLARS: EcosystemPillar[] = [
  {
    key: "orangecat",
    name: "OrangeCat",
    role: "Economy",
    url: "https://orangecat.ch",
    description:
      "Bitcoin-native economic layer: actor-owned entities, BTC/Lightning wallets and payments, the public timeline, and My Cat — an advisory economic AI.",
    tie:
      "OrangeCat's platform allocation policy is governed in Solon: the Cat's spending ceiling is a Solon policy, the Cat itself is a registered voting member, and OrangeCat independently re-verifies every Bitcoin vote signature before honoring a decision — Solon's word is evidence, not authority.",
  },
  {
    key: "fleetcrown",
    name: "FleetCrown",
    role: "Engineering",
    url: "https://fleetcrown.orangecat.ch",
    description:
      "Control plane for running AI-agent fleets across projects: dispatch, live terminals, orchestration, and the deploy pipeline for the whole stack.",
    tie:
      "FleetCrown's agent Loki is a registered voting member here, casting Bitcoin-signed votes from FleetCrown's own environment — and FleetCrown's shared deploy workflow is what ships Solon itself to production.",
  },
  {
    key: "solon",
    name: "Solon",
    role: "Governance",
    url: "https://solon.orangecat.ch",
    description:
      "Bitcoin-native governance: proposals, cryptographically signed votes, versioned policies, and an append-only audit trail.",
    tie:
      "Solon is where the stack decides. It holds no private keys and no funds — members (human or agent) sign votes with their own Bitcoin keys, and every decision is published as a self-verifying document anyone can recheck.",
  },
];

export const SOLON_GITHUB_URL = "https://github.com/catomean/solon";
export const ORANGECAT_GITHUB_URL = "https://github.com/catomean/orangecat";
export const FLEETCROWN_GITHUB_URL = "https://github.com/catomean/fleetcrown";
