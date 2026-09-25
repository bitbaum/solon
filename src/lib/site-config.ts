/**
 * The site map: which pages exist, how they are grouped, and under which key
 * each is named. The words live in messages/<locale>.json — `Site.sections`,
 * `Site.links` (a page's name) and `Site.desc` (its one-line description) — so
 * this file holds structure, the messages hold language, and neither repeats
 * the other. The header's mega menu, the mobile menu and the footer all render
 * from here.
 */
import type en from "../../messages/en.json";
import type { PhotoId } from "./content/photos";

/** Keys must exist in messages (checked by typecheck). */
export type LinkKey = keyof typeof en.Site.links;
export type SectionKey = keyof typeof en.Site.sections;

export interface NavLink {
  key: LinkKey;
  href: string;
}

export interface MenuSection {
  key: SectionKey;
  /** The section's own overview page. */
  href: string;
  children: NavLink[];
  /** A featured page shown with its photograph in the mega menu. */
  feature?: { link: LinkKey; href: string; photo: PhotoId };
}

/** The header's four panels, in reading order. */
export const MENU: MenuSection[] = [
  {
    key: "useCases",
    href: "/for",
    children: [
      { key: "forCompanies", href: "/for/companies" },
      { key: "forTowns", href: "/for/towns" },
      { key: "forAssociations", href: "/for/associations" },
      { key: "forCommunities", href: "/for/communities" },
      { key: "forNetworkStates", href: "/for/network-states" },
    ],
    feature: { link: "forNetworkStates", href: "/for/network-states", photo: "earthAtNight" },
  },
  {
    key: "governance",
    href: "/governance",
    children: [
      { key: "governance", href: "/governance" },
      { key: "ideas", href: "/governance/ideas" },
      { key: "newEra", href: "/governance/new-era" },
      { key: "methods", href: "/governance/methods" },
      { key: "thresholds", href: "/governance/thresholds" },
      { key: "whoDecides", href: "/governance/who-decides" },
      { key: "profiles", href: "/governance/profiles" },
      { key: "voting", href: "/governance/voting" },
    ],
    feature: { link: "ideas", href: "/governance/ideas", photo: "landsgemeindePainting" },
  },
  {
    key: "platform",
    href: "/platform",
    children: [
      { key: "platform", href: "/platform" },
      { key: "security", href: "/security" },
      { key: "features", href: "/features" },
      { key: "api", href: "/integration" },
      { key: "about", href: "/about" },
    ],
    feature: { link: "newEra", href: "/governance/new-era", photo: "starlinkTownHall" },
  },
  {
    key: "decisions",
    href: "/proposals",
    children: [
      { key: "decisions", href: "/proposals" },
      { key: "dashboard", href: "/dashboard" },
      { key: "propose", href: "/propose" },
      { key: "join", href: "/join" },
      { key: "newOrg", href: "/orgs/new" },
      { key: "record", href: "/governance/audit" },
      { key: "treasury", href: "/treasury/bitcoin" },
      { key: "liveState", href: "/ecosystem" },
    ],
  },
];

/**
 * Every page on the site, grouped — the menu's sections plus the few pages
 * that belong to no panel. The footer and mobile menu render this.
 */
export const SITE_SECTIONS: { key: SectionKey; children: NavLink[] }[] = [
  ...MENU.map(({ key, children }) => ({ key, children })),
  {
    key: "more",
    children: [
      { key: "useCases", href: "/for" },
      { key: "hire", href: "/hire" },
      { key: "credits", href: "/credits" },
    ],
  },
];

/** Every page, flattened and de-duplicated — the set of routes that exist. */
export const SITE_LINKS: NavLink[] = [
  ...new Map(SITE_SECTIONS.flatMap((s) => s.children).map((l) => [l.href, l])).values(),
];

/** The header's top level: one entry per panel. */
export const PRIMARY_NAV = MENU.map(({ key, href }) => ({ key, href }));

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
