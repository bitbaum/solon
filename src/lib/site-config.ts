/**
 * The route catalog is the single source of truth for every navigable page.
 * Keep unimplemented product ideas out of this file so shared navigation can
 * never advertise a dead end.
 */
export const ROUTES = {
  home: '/',
  features: '/features',
  security: '/security',
  integration: '/integration',
  about: '/about',
  votingDemo: '/governance/voting',
  treasuryDemo: '/treasury/bitcoin',
  dashboard: '/dashboard',
  dashboardTreasury: '/dashboard/treasury',
  dashboardVoting: '/dashboard/voting',
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];

export interface NavItem {
  title: string;
  href: AppRoute;
  description: string;
}

export interface NavSection {
  title: string;
  description: string;
  items: readonly NavItem[];
}

export const NAV_ITEMS: readonly NavSection[] = [
  {
    title: 'Platform',
    description: 'Understand the product and trust model',
    items: [
      { title: 'Overview', href: ROUTES.home, description: 'See the platform and its four pillars' },
      { title: 'Features', href: ROUTES.features, description: 'Compare the core capabilities' },
      { title: 'Security', href: ROUTES.security, description: 'Review custody, privacy, and verification' },
      { title: 'Integration', href: ROUTES.integration, description: 'Use the APIs implemented today' },
    ],
  },
  {
    title: 'Explore',
    description: 'Try a guided public demonstration',
    items: [
      { title: 'Voting demo', href: ROUTES.votingDemo, description: 'Explore proposals and participation' },
      { title: 'Treasury demo', href: ROUTES.treasuryDemo, description: 'Inspect balances and transactions' },
      { title: 'About Solon', href: ROUTES.about, description: 'Learn the mission and principles' },
    ],
  },
];

export const DASHBOARD_NAV_ITEMS: readonly NavItem[] = [
  { title: 'Overview', href: ROUTES.dashboard, description: 'Choose your next governance task' },
  { title: 'Treasury', href: ROUTES.dashboardTreasury, description: 'Review the organization treasury' },
  { title: 'Voting', href: ROUTES.dashboardVoting, description: 'Cast a signed member vote' },
];

export const IMPLEMENTED_PAGE_ROUTES: readonly AppRoute[] = Object.values(ROUTES);

export const REPOSITORY_URL = 'https://github.com/maonakamoto/solon';

export const THEME = {
  navy: 'var(--navy)',
  navyLight: 'var(--navy-light)',
  navyDark: 'var(--navy-dark)',
  accent: 'var(--accent)',
  accentDark: 'var(--accent-dark)',
};
