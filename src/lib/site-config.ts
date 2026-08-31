export interface NavChildItem {
  title: string;
  href: string;
  description?: string;
}

export interface NavSection {
  title: string;
  description?: string;
  children?: NavChildItem[];
  href?: string;
}

// Only routes that actually exist belong here — a nav link to a 404 is a lie.
// Descriptions live here too (SSOT), not in the component that renders them.
export const NAV_ITEMS: NavSection[] = [
  {
    title: "Platform",
    description: "What Solon is and how it works",
    children: [
      { title: "Overview", href: "/", description: "The platform in one page" },
      { title: "Features", href: "/features", description: "What runs in production today" },
      {
        title: "Security",
        href: "/security",
        description: "No keys, no custody, no rewritable history",
      },
      { title: "Integration", href: "/integration", description: "API and integration guides" },
    ],
  },
  {
    title: "Governance",
    description: "Voting and the public record",
    children: [
      {
        title: "Proposals",
        href: "/proposals",
        description: "Everything up for decision, and its next step",
      },
      {
        title: "File a proposal",
        href: "/propose",
        description: "Put something on the record, signed",
      },
      { title: "Become a member", href: "/join", description: "Bind a Bitcoin key and get a vote" },
      {
        title: "Audit Trail",
        href: "/governance/audit",
        description: "The append-only record itself",
      },
      {
        title: "How voting works",
        href: "/governance/voting",
        description: "Bitcoin-signed votes, verified server-side",
      },
    ],
  },
  {
    title: "Treasury",
    description: "Watch-only Bitcoin treasuries",
    children: [
      {
        title: "Bitcoin Treasury",
        href: "/treasury/bitcoin",
        description: "On-chain, independently verifiable",
      },
    ],
  },
  {
    title: "Ecosystem",
    description: "The three-pillar stack Solon governs for",
    children: [
      {
        title: "Three Pillars",
        href: "/ecosystem",
        description: "Economy, engineering, governance — live state",
      },
      { title: "OrangeCat", href: "https://orangecat.ch", description: "The economic pillar" },
      {
        title: "FleetCrown",
        href: "https://fleetcrown.orangecat.ch",
        description: "The engineering pillar",
      },
    ],
  },
  {
    title: "Resources",
    description: "About the project",
    children: [
      { title: "About", href: "/about", description: "Why Solon exists and who runs it" },
      {
        title: "API",
        href: "/integration",
        description: "Read the governed state programmatically",
      },
    ],
  },
];

/** Homepage hero destinations — the two outcomes a first visitor can take. */
export const HERO_CTAS = {
  primary: { href: "/dashboard/voting", labelKey: "cta_primary" },
  secondary: { href: "/treasury/bitcoin", labelKey: "cta_secondary" },
} as const;

/** Every internal nav destination, flattened — the set of routes that exist. */
export const NAV_CHILDREN: NavChildItem[] = NAV_ITEMS.flatMap((s) => s.children ?? []);

/**
 * The footer, derived from NAV_ITEMS rather than hand-written beside it.
 *
 * The footer used to restate six of these routes as its own literal <Link>s.
 * Nothing tied the two lists together, so removing a page from the nav left the
 * footer pointing at it — the exact "a footer link to a 404 is a lie" the
 * footer's own comment warns about, with no way to notice.
 *
 * A footer entry names an href that must already exist in NAV_ITEMS. `label`
 * is optional and only for the places the footer deliberately says something
 * shorter than the nav does ("Voting", not "How voting works"). Everything
 * else inherits, so a rename in NAV_ITEMS reaches the footer for free.
 *
 * Enforced by src/lib/__tests__/site-config.test.ts: an href here that is not
 * in NAV_ITEMS fails the suite.
 */
export interface FooterLink {
  href: string;
  /** Only when the footer deliberately differs from the nav's wording. */
  label?: string;
}

export interface FooterSection {
  title: string;
  links: FooterLink[];
}

export const FOOTER_SECTIONS: FooterSection[] = [
  {
    title: "Platform",
    links: [{ href: "/features" }, { href: "/security" }, { href: "/integration" }],
  },
  {
    title: "Governance",
    links: [
      { href: "/governance/voting", label: "Voting" },
      { href: "/governance/audit" },
      { href: "/treasury/bitcoin" },
    ],
  },
  {
    title: "Ecosystem",
    // The sibling products come from ECOSYSTEM_PILLARS in the component — one
    // pillar SSOT, not restated here.
    links: [{ href: "/ecosystem" }],
  },
  {
    title: "Resources",
    links: [{ href: "/about" }, { href: "/integration", label: "API" }],
  },
];

/** The label a footer link shows: its override, else the nav's own title. */
export function footerLinkLabel(link: FooterLink): string {
  if (link.label) return link.label;
  const item = NAV_CHILDREN.find((c) => c.href === link.href);
  return item?.title ?? link.href;
}
