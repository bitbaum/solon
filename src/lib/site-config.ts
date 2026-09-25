/**
 * The site map: which pages exist, and under which key each is named. The
 * words themselves live in messages/<locale>.json under `Site.links.<key>` and
 * `Site.sections.<key>` — so this file holds structure, the messages hold
 * language, and neither repeats the other.
 */
import type en from "../../messages/en.json";

/** A link's name key: must exist in messages `Site.links` (checked by typecheck). */
export type LinkKey = keyof typeof en.Site.links;
export type SectionKey = keyof typeof en.Site.sections;

export interface NavLink {
  key: LinkKey;
  href: string;
}

export interface NavSection {
  key: SectionKey;
  children: NavLink[];
}

/**
 * Every page on the site, grouped — the SSOT the footer and the mobile menu
 * render. Only routes that exist belong here: a link to a 404 is a lie.
 */
export const SITE_SECTIONS: NavSection[] = [
  {
    key: "solon",
    children: [
      { key: "hire", href: "/hire" },
      { key: "security", href: "/security" },
      { key: "features", href: "/features" },
      { key: "about", href: "/about" },
      { key: "api", href: "/integration" },
    ],
  },
  {
    key: "howItWorks",
    children: [
      { key: "governance", href: "/governance" },
      { key: "methods", href: "/governance/methods" },
      { key: "thresholds", href: "/governance/thresholds" },
      { key: "whoDecides", href: "/governance/who-decides" },
      { key: "profiles", href: "/governance/profiles" },
      { key: "voting", href: "/governance/voting" },
    ],
  },
  {
    key: "takePart",
    children: [
      { key: "dashboard", href: "/dashboard" },
      { key: "decisions", href: "/proposals" },
      { key: "propose", href: "/propose" },
      { key: "join", href: "/join" },
      { key: "newOrg", href: "/orgs/new" },
      { key: "record", href: "/governance/audit" },
    ],
  },
  {
    key: "more",
    children: [
      { key: "treasury", href: "/treasury/bitcoin" },
      { key: "liveState", href: "/ecosystem" },
      { key: "credits", href: "/credits" },
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
  { key: "governance", href: "/governance" },
  { key: "decisions", href: "/proposals" },
  { key: "security", href: "/security" },
];

export const HIRE_HREF = "/hire";

/**
 * Pages whose words have been translated. Every other page still shows its
 * English text in every language — and says so, in the reader's language,
 * rather than pretending (components/site/translation-notice.tsx).
 */
export const TRANSLATED_ROUTES = new Set<string>(["/", "/hire", "/security", "/credits"]);

/**
 * Where a message to the people behind Solon arrives. An @orangecat.ch apex
 * address — the only domain on the box that receives mail.
 */
export const CONTACT_EMAIL = "cato@orangecat.ch";
