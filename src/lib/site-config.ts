export interface NavLink {
  title: string;
  href: string;
}

export interface NavSection {
  title: string;
  children: NavLink[];
}

/**
 * Every page on the site, grouped — the SSOT the footer and the mobile menu
 * render. Only routes that exist belong here: a link to a 404 is a lie.
 *
 * The header does NOT render this. It used to — six mega-menus across the top
 * of every page, whose buttons wrapped onto two lines at 1440px. The header now
 * carries PRIMARY_NAV (a handful of links, tested to be a subset of this), and
 * everything else is one scroll away in the footer.
 */
export const SITE_SECTIONS: NavSection[] = [
  {
    title: "Solon",
    children: [
      { title: "Hire Solon", href: "/hire" },
      { title: "Security", href: "/security" },
      { title: "Features", href: "/features" },
      { title: "About", href: "/about" },
      { title: "API", href: "/integration" },
    ],
  },
  {
    title: "How it works",
    children: [
      { title: "The art and science", href: "/governance" },
      { title: "Voting methods", href: "/governance/methods" },
      { title: "Quorum and threshold", href: "/governance/thresholds" },
      { title: "Who decides what", href: "/governance/who-decides" },
      { title: "Five kinds of organization", href: "/governance/profiles" },
      { title: "How a vote is cast", href: "/governance/voting" },
    ],
  },
  {
    title: "Take part",
    children: [
      { title: "Dashboard", href: "/dashboard" },
      { title: "Decisions", href: "/proposals" },
      { title: "File a proposal", href: "/propose" },
      { title: "Become a member", href: "/join" },
      { title: "Start an organization", href: "/orgs/new" },
      { title: "The record", href: "/governance/audit" },
    ],
  },
  {
    title: "More",
    children: [
      { title: "Treasury", href: "/treasury/bitcoin" },
      { title: "Live state", href: "/ecosystem" },
      { title: "Photo credits", href: "/credits" },
    ],
  },
];

/** Every page, flattened — the set of routes that exist. */
export const SITE_LINKS: NavLink[] = SITE_SECTIONS.flatMap((s) => s.children);

/**
 * The header's links. Few on purpose: a first-time visitor needs to know how it
 * works, see real decisions, and trust it. "Hire Solon" is the header's one
 * call to action and is rendered separately from these.
 */
export const PRIMARY_NAV: NavLink[] = [
  { title: "How it works", href: "/governance" },
  { title: "Decisions", href: "/proposals" },
  { title: "Security", href: "/security" },
];

export const HIRE_HREF = "/hire";

/**
 * Where a message to the people behind Solon arrives. An @orangecat.ch apex
 * address — the only domain on the box that receives mail.
 */
export const CONTACT_EMAIL = "cato@orangecat.ch";
