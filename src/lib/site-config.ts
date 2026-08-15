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
    title: 'Platform',
    description: 'What Solon is and how it works',
    children: [
      { title: 'Overview', href: '/', description: 'The platform in one page' },
      { title: 'Features', href: '/features', description: 'What runs in production today' },
      { title: 'Security', href: '/security', description: 'No keys, no custody, no rewritable history' },
      { title: 'Integration', href: '/integration', description: 'API and integration guides' },
    ],
  },
  {
    title: 'Governance',
    description: 'Voting and the public record',
    children: [
      { title: 'Proposals', href: '/proposals', description: 'Everything up for decision, and its next step' },
      { title: 'File a proposal', href: '/propose', description: 'Put something on the record, signed' },
      { title: 'Become a member', href: '/join', description: 'Bind a Bitcoin key and get a vote' },
      { title: 'Audit Trail', href: '/governance/audit', description: 'The append-only record itself' },
      { title: 'How voting works', href: '/governance/voting', description: 'Bitcoin-signed votes, verified server-side' },
    ],
  },
  {
    title: 'Treasury',
    description: 'Watch-only Bitcoin treasuries',
    children: [
      { title: 'Bitcoin Treasury', href: '/treasury/bitcoin', description: 'On-chain, independently verifiable' },
    ],
  },
  {
    title: 'Ecosystem',
    description: 'The three-pillar stack Solon governs for',
    children: [
      { title: 'Three Pillars', href: '/ecosystem', description: 'Economy, engineering, governance — live state' },
      { title: 'OrangeCat', href: 'https://orangecat.ch', description: 'The economic pillar' },
      { title: 'FleetCrown', href: 'https://fleetcrown.orangecat.ch', description: 'The engineering pillar' },
    ],
  },
  {
    title: 'Resources',
    description: 'About the project',
    children: [
      { title: 'About', href: '/about', description: 'Why Solon exists and who runs it' },
      { title: 'API', href: '/integration', description: 'Read the governed state programmatically' },
    ],
  },
];

/** Homepage hero destinations — the two outcomes a first visitor can take. */
export const HERO_CTAS = {
  primary: { href: '/dashboard/voting', labelKey: 'cta_primary' },
  secondary: { href: '/treasury/bitcoin', labelKey: 'cta_secondary' },
} as const;
