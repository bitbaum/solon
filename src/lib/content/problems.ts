import type en from "../../../messages/en.json";
import { SITE_LINKS, type LinkKey } from "@/lib/site-config";
import type { CapabilityKey } from "./capabilities";

/**
 * "What it solves" — the front page's answer to "what is this actually for?"
 *
 * Each entry is a concrete situation, then what happens on Solon, then the page
 * where it happens. This file holds the structure; the words live in messages
 * `Home.problems.items.<key>`, and the link's label is that page's own name
 * (`Site.links.<link>`), so a card can only point at a page the site map knows.
 *
 * Honesty rule: a card describes only what works today. Where a card rests on
 * one of the capabilities in ./capabilities.ts it names it, and the test
 * refuses any that is not "available". The treasury is left out on purpose:
 * registering a group's addresses is an operator step, not something a
 * visitor can do, and the treasury page shows only the first organization.
 */
export type ProblemKey = keyof typeof en.Home.problems.items;

export interface Problem {
  key: ProblemKey;
  /** The page where it happens — a key of the site map, never a typed path. */
  link: LinkKey;
  /** The capability the card relies on, when one names it. */
  capability?: CapabilityKey;
}

export interface ProblemScale {
  key: "you" | "everyone";
  items: readonly Problem[];
}

export const PROBLEM_SCALES: readonly ProblemScale[] = [
  {
    key: "you",
    items: [
      { key: "groupChat", link: "propose", capability: "proposalsAndVotes" },
      { key: "nightShift", link: "decisions", capability: "proposalsAndVotes" },
      { key: "loudestWins", link: "methods", capability: "countingMethods" },
      { key: "noWallet", link: "voting", capability: "signedVotes" },
      { key: "startGroup", link: "newOrg", capability: "founding" },
      // Places has no capability entry; the card is backed by /compare itself.
      { key: "moving", link: "placesCompare" },
    ],
  },
  {
    key: "everyone",
    items: [
      { key: "closedDoors", link: "record", capability: "publicRecord" },
      { key: "trustTheCount", link: "security", capability: "signedVotes" },
      // The humans-only red lines: src/lib/config/governance.ts.
      { key: "algorithmDecides", link: "whoDecides" },
      { key: "hiddenRules", link: "profiles", capability: "ruleTemplates" },
      // OrangeCat's allocation_policy and originator_share, live on /ecosystem.
      { key: "platformRules", link: "liveState" },
      { key: "whereYouLive", link: "places" },
    ],
  },
];

/** Where a card's link goes: the site map's own path for that page. */
export function problemHref(link: LinkKey): string {
  const found = SITE_LINKS.find((l) => l.key === link);
  if (!found) throw new Error(`no page named "${link}" in the site map`);
  return found.href;
}
