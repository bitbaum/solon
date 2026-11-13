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
import type { Locale } from "@/i18n/routing";

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

/**
 * The use cases: in the footer and the mobile menu, and on the home page as
 * tiles. Law took their header slot (2026-11-06, docs/design/2026-11-global-law-and-exit.md).
 */
const USE_CASE_SECTION: { key: SectionKey; children: NavLink[] } = {
  key: "useCases",
  children: [
    { key: "forCompanies", href: "/for/companies" },
    { key: "forTowns", href: "/for/towns" },
    { key: "forAssociations", href: "/for/associations" },
    { key: "forCommunities", href: "/for/communities" },
    { key: "forNetworkStates", href: "/for/network-states" },
  ],
};

/**
 * The header's four panels, in reading order: the few pages most people come
 * for, each with one line on what it holds. They are a curated subset of the
 * site map, never a second list: every page here is also in SITE_SECTIONS,
 * which holds all of them and which the footer, the mobile menu and the Find
 * palette render. A page does not need a header slot to be found.
 */
export const MENU: MenuSection[] = [
  {
    key: "law",
    href: "/law",
    children: [
      { key: "law", href: "/law" },
      { key: "lawAsk", href: "/law/ask" },
      { key: "lawAmendments", href: "/law/amendments" },
      { key: "lawCoverage", href: "/law/coverage" },
    ],
  },
  {
    key: "places",
    href: "/places",
    children: [
      { key: "places", href: "/places" },
      { key: "placesCompare", href: "/compare" },
      { key: "structures", href: "/structures" },
      { key: "placesCoverage", href: "/places/coverage" },
    ],
  },
  {
    key: "data",
    href: "/statistics",
    children: [
      { key: "statistics", href: "/statistics" },
      { key: "budgets", href: "/budgets" },
      { key: "statisticsMethods", href: "/statistics/methods" },
      { key: "statisticsGaps", href: "/statistics/gaps" },
      { key: "statisticsResearch", href: "/statistics/research" },
      { key: "statisticsEvents", href: "/statistics/events" },
    ],
  },
  {
    key: "governance",
    href: "/governance",
    children: [
      { key: "governance", href: "/governance" },
      { key: "decisions", href: "/proposals" },
      { key: "propose", href: "/propose" },
      { key: "newOrg", href: "/orgs/new" },
      { key: "dashboard", href: "/dashboard" },
    ],
    feature: { link: "ideas", href: "/governance/ideas", photo: "landsgemeindePainting" },
  },
];

/**
 * Every page on the site, grouped. The footer, the mobile menu and the Find
 * palette render this; the header's panels (MENU) show a few of them.
 */
export const SITE_SECTIONS: { key: SectionKey; children: NavLink[] }[] = [
  {
    key: "law",
    children: [
      { key: "law", href: "/law" },
      { key: "lawAmendments", href: "/law/amendments" },
      { key: "lawAsk", href: "/law/ask" },
      { key: "lawCoverage", href: "/law/coverage" },
    ],
  },
  {
    key: "places",
    children: [
      { key: "places", href: "/places" },
      { key: "placesCompare", href: "/compare" },
      { key: "placesCoverage", href: "/places/coverage" },
      { key: "structures", href: "/structures" },
    ],
  },
  {
    key: "data",
    children: [
      { key: "statistics", href: "/statistics" },
      { key: "statisticsWhy", href: "/statistics/why" },
      { key: "budgets", href: "/budgets" },
      { key: "statisticsEvents", href: "/statistics/events" },
      { key: "statisticsMethods", href: "/statistics/methods" },
      { key: "statisticsGaps", href: "/statistics/gaps" },
      { key: "statisticsResearch", href: "/statistics/research" },
    ],
  },
  {
    key: "governance",
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
  },
  {
    key: "decisions",
    children: [
      { key: "decisions", href: "/proposals" },
      { key: "dashboard", href: "/dashboard" },
      { key: "askSolon", href: "/ask" },
      { key: "propose", href: "/propose" },
      { key: "join", href: "/join" },
      { key: "newOrg", href: "/orgs/new" },
      { key: "record", href: "/governance/audit" },
      { key: "treasury", href: "/treasury/bitcoin" },
      { key: "liveState", href: "/ecosystem" },
    ],
  },
  USE_CASE_SECTION,
  {
    key: "platform",
    children: [
      { key: "platform", href: "/platform" },
      { key: "security", href: "/security" },
      { key: "features", href: "/features" },
      { key: "api", href: "/integration" },
      { key: "whitepaper", href: "/whitepaper" },
      { key: "faq", href: "/faq" },
      { key: "about", href: "/about" },
    ],
  },
  {
    key: "more",
    children: [
      { key: "whatYouCanDo", href: "/what-you-can-do" },
      { key: "useCases", href: "/for" },
      { key: "hire", href: "/hire" },
      { key: "blog", href: "/blog" },
      { key: "roadmap", href: "/roadmap" },
      { key: "changelog", href: "/changelog" },
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
 * Where this site actually serves. Next resolves the generated og:image against
 * `metadataBase`; without it the tag is emitted as http://localhost:3000/... —
 * present, plausible, and unfetchable by every social scraper. Texts that leave
 * the site (a drafted proposal) link back with it too.
 */
export const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://solon.orangecat.ch";

/**
 * Pages whose words have been translated. Every other page still shows its
 * English text in every language — and says so, in the reader's language,
 * rather than pretending (components/site/translation-notice.tsx).
 */
export const TRANSLATED_ROUTES = new Set<string>([
  "/",
  "/hire",
  "/security",
  "/credits",
  "/auth/error",
]);

/** Sections translated as a whole: every page under the prefix. */
const TRANSLATED_PREFIXES = ["/places", "/compare", "/structures", "/statistics", "/budgets"];

/**
 * The languages in which the `Amend` messages (proposing a change to the law)
 * are written. The pages that read them — an act, the proposal form, the list
 * of proposals and one proposal — count as translated in these languages only;
 * in every other language they stay in English under the notice. Adding a
 * language here is how its translation becomes required (the parity test reads
 * this list).
 */
export const AMEND_LOCALES: readonly Locale[] = ["de", "fr", "it", "ru"];

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

/** The pages whose words are the `Amend` messages: act, propose, list, one proposal. */
const AMEND_ROUTES = [
  new RegExp(`^/law/${UUID}$`),
  new RegExp(`^/law/${UUID}/amend$`),
  /^\/law\/amendments$/,
  new RegExp(`^/law/amendments/${UUID}$`),
];

/**
 * Whether a page has been translated into the reader's language. Without a
 * locale the question is asked of the sections translated for everyone.
 */
export const isTranslatedRoute = (pathname: string, locale?: Locale): boolean =>
  TRANSLATED_ROUTES.has(pathname) ||
  TRANSLATED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)) ||
  (locale !== undefined &&
    AMEND_LOCALES.includes(locale) &&
    AMEND_ROUTES.some((route) => route.test(pathname)));

/**
 * The everyday pages: where members join, suggest, vote and read the history.
 * They speak plain words; stored values (OPEN, SIMPLE_MAJORITY, HUMANS_ONLY)
 * only appear under "Technical details". The explainers, /security, /api,
 * /ecosystem and /treasury/bitcoin are the deep side and may be as technical
 * as they need to be. tests/e2e/render.spec.ts holds these pages to it.
 */
export const EVERYDAY_ROUTES = [
  "/dashboard",
  "/dashboard/treasury",
  "/dashboard/voting",
  "/proposals",
  "/propose",
  "/join",
  "/orgs/new",
  "/governance/audit",
] as const;

/**
 * Pages that open on a photograph that stays dark in both themes (`<FullBleed
 * under alwaysDark>`: a night photograph with no daylight counterpart). Over
 * it the transparent header wears the dark theme whatever the reader chose.
 * Every other page opens on a photograph that follows the theme, and its header
 * does too. Known from the path, so the server renders it right and nothing
 * flashes. A `[slug]` segment matches any one segment.
 * src/lib/__tests__/header-over-photo.test.ts fails when a page passes both
 * props and is missing here, or is listed and does not.
 */
export const HEADER_OVER_PHOTO_ROUTES = ["/governance/new-era"] as const;

export function isHeaderOverPhoto(pathname: string): boolean {
  const parts = pathname.split("/").filter(Boolean);
  return HEADER_OVER_PHOTO_ROUTES.some((route) => {
    const want = route.split("/").filter(Boolean);
    return (
      want.length === parts.length &&
      want.every((seg, i) => (seg.startsWith("[") ? true : seg === parts[i]))
    );
  });
}

/**
 * Where a message to the people behind Solon arrives. An @orangecat.ch apex
 * address — the only domain on the box that receives mail.
 */
export const CONTACT_EMAIL = "cato@orangecat.ch";
