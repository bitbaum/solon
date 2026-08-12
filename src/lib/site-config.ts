export interface NavChildItem {
  title: string;
  href: string;
}

export interface NavSection {
  title: string;
  children?: NavChildItem[];
  href?: string;
}

// Only routes that actually exist belong here — a nav link to a 404 is a lie.
export const NAV_ITEMS: NavSection[] = [
  {
    title: 'Platform',
    children: [
      { title: 'Overview', href: '/' },
      { title: 'Features', href: '/features' },
      { title: 'Security', href: '/security' },
      { title: 'Integration', href: '/integration' },
    ],
  },
  {
    title: 'Governance',
    children: [
      { title: 'Voting System', href: '/governance/voting' },
      { title: 'Audit Trail', href: '/governance/audit' },
    ],
  },
  {
    title: 'Treasury',
    children: [{ title: 'Bitcoin Treasury', href: '/treasury/bitcoin' }],
  },
  {
    title: 'Ecosystem',
    children: [
      { title: 'Three Pillars', href: '/ecosystem' },
      { title: 'OrangeCat', href: 'https://orangecat.ch' },
      { title: 'FleetCrown', href: 'https://fleetcrown.orangecat.ch' },
    ],
  },
  {
    title: 'Resources',
    children: [{ title: 'About', href: '/about' }],
  },
];

export const THEME = {
  navy: 'var(--navy)',
  navyLight: 'var(--navy-light)',
  navyDark: 'var(--navy-dark)',
  accent: 'var(--accent)',
  accentDark: 'var(--accent-dark)'
};




