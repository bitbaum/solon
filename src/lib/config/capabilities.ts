/**
 * What you can do on Solon — every capability in the visitor's words, with a
 * place to start. The same idea as OrangeCat's map (its capability-map.ts):
 * a person who cannot name what they want should still find it.
 *
 * Hrefs are the site's own (site-config.ts); the words here are the plain
 * version of what each page does, one verb each. A capability not on this
 * list does not exist as far as a newcomer is concerned.
 */
import { COLLECTIVE_KIND_LIST } from "@/lib/collective-kinds";

export interface SolonCapability {
  id: string;
  verb: string;
  what: string;
  example: string;
  steps: readonly [string, string, string];
  startHref: string;
}

export const SOLON_CAPABILITIES: readonly SolonCapability[] = [
  {
    id: "found",
    verb: "Start an organization",
    what: `Give a body of people a place to decide: ${COLLECTIVE_KIND_LIST.map((k) => k.name.toLowerCase()).join(", ")}.`,
    example: "The Witikon fund: residents deciding what their own money pays for.",
    steps: [
      "Say what kind of body it is and where it belongs",
      "Choose who decides — you, everyone, or elected delegates",
      "Take the founding seat; everything after is decided by vote",
    ],
    startHref: "/orgs/new",
  },
  {
    id: "propose",
    verb: "Put a question to a vote",
    what: "File a proposal: what is decided, by whom, at what bar — written once, on the record.",
    example: "“Spend 2,000 on the playground.”",
    steps: [
      "Write the question",
      "Pick its category — the rule follows",
      "Members vote for a week",
    ],
    startHref: "/propose",
  },
  {
    id: "join",
    verb: "Take a seat",
    what: "Become a member of an organization: one account, your own key if you want one.",
    example: "Your neighbourhood association, your co-op, your company's board.",
    steps: [
      "Open the organization",
      "Ask a member to suggest you",
      "The members vote you in — humans only",
    ],
    startHref: "/join",
  },
  {
    id: "vote",
    verb: "Vote",
    what: "One click with your account, or a Bitcoin signature anyone can recount.",
    example: "Approve the budget from your phone on the tram.",
    steps: ["Read the proposal", "Cast your vote", "Watch the tally — it is public"],
    startHref: "/dashboard/voting",
  },
  {
    id: "record",
    verb: "Read the record",
    what: "Every step, written once, never edited: who proposed, who voted, what passed.",
    example: "Check how last year's spending was decided.",
    steps: [
      "Open the record",
      "Follow any decision back to its vote",
      "Recount it yourself if you like",
    ],
    startHref: "/governance/audit",
  },
  {
    id: "treasury",
    verb: "See the money",
    what: "The organization's Bitcoin, read from the chain. Solon can look; it can never spend.",
    example: "How much is in the fund right now, to the satoshi.",
    steps: [
      "Open the treasury",
      "See the balance, read from the chain",
      "Nothing here can move it",
    ],
    startHref: "/treasury/bitcoin",
  },
  {
    id: "hire",
    verb: "Have Solon run it for you",
    what: "The studio sets your governance up and keeps it running.",
    example: "A town of 3,000 that wants its assembly online by spring.",
    steps: ["Tell us who you are", "We propose a structure", "You decide — under it"],
    startHref: "/hire",
  },
];

export const CAPABILITY_MAP_PAGE = {
  title: "What you can do here",
  lede: "Everything on this page works today. Start with a question, or find the thing you came for.",
  door: {
    prompt: "What do you want to decide?",
    placeholder: "Spend 2,000 on the playground · admit a new member · change how we vote",
    button: "Draft it",
  },
} as const;
