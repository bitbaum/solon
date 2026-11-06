/**
 * The official routes by which a place's law is changed from outside its
 * legislature: who may start one, how many must sign, in what time, before
 * whom, and the provision that says so (design:
 * docs/design/2026-11-amending-the-law.md, "The official route").
 *
 * A route is shipped only with its source and the day it was read. An
 * amendment's page shows the route's bar beside Solon's own count and never
 * adds the two together: support on Solon is not an official signature.
 */
import type { ActKind } from "./index";

export type RouteVenue = "voters" | "legislature" | "town_meeting" | "authorities";

export interface OfficialRoute {
  key: string;
  /** Key in LAW_AUTHORITIES whose law the route changes. */
  authority: string;
  name: string;
  /** What a route of this kind can change; an amendment to another kind of act cannot take it. */
  appliesTo: readonly ActKind[];
  /** Who decides once the route's bar is met. */
  venue: RouteVenue;
  /** Who may sign, in the source's own terms. */
  whoMaySign: string;
  /**
   * How many must sign: a number, or a share of a stated base (Wyoming's 15%
   * of those who voted in the last general election); null when the route has
   * no bar.
   */
  signatures: { count: number } | { percent: number; of: string } | null;
  /** What else the route requires, in the source's own terms (a spread across counties, sponsors). */
  alsoRequired?: readonly string[];
  /** What the route cannot be used for, in the source's own terms. */
  cannotChange?: string;
  /** How long the signatures may take, from the day the route says it starts; null when unbounded. */
  window: { months: number } | { days: number } | null;
  /** What the route obliges the authority to do once it is taken. */
  outcome: string;
  source: { title: string; provision: string; url: string; readOn: string };
}

export const OFFICIAL_ROUTES: readonly OfficialRoute[] = [
  {
    key: "ch-popular-initiative",
    authority: "ch",
    name: "Federal popular initiative",
    appliesTo: ["constitution"],
    venue: "voters",
    whoMaySign: "Swiss citizens eligible to vote",
    signatures: { count: 100_000 },
    window: { months: 18 },
    outcome:
      "A partial revision of the Federal Constitution is put to the vote of the People and the Cantons.",
    source: {
      title: "Federal Constitution of the Swiss Confederation (SR 101)",
      provision: "Art. 139",
      url: "https://www.fedlex.admin.ch/eli/cc/1999/404/en#art_139",
      readOn: "2026-11-06",
    },
  },
  {
    key: "ch-petition",
    authority: "ch",
    name: "Petition to the federal authorities",
    appliesTo: ["constitution", "statute", "ordinance", "decree", "regulation", "other"],
    venue: "authorities",
    whoMaySign: "Every person",
    signatures: null,
    window: null,
    outcome: "The authorities must take note of the petition; nobody may be disadvantaged for it.",
    source: {
      title: "Federal Constitution of the Swiss Confederation (SR 101)",
      provision: "Art. 33",
      url: "https://www.fedlex.admin.ch/eli/cc/1999/404/en#art_33",
      readOn: "2026-11-06",
    },
  },
  {
    key: "us-wy-initiative",
    authority: "us-wy",
    name: "Citizen initiative",
    appliesTo: ["statute"],
    venue: "voters",
    whoMaySign: "qualified voters",
    signatures: { percent: 15, of: "those who voted in the preceding general election" },
    alsoRequired: [
      "An application signed by at least 100 qualified voters as sponsors, certified by the Secretary of State before the petition circulates",
      "Signatures from 15% of the voters in at least two-thirds of the counties, as counted in each county's preceding general election",
    ],
    cannotChange:
      "The initiative cannot dedicate revenues, make or repeal appropriations, create courts or set their jurisdiction or rules, enact local or special legislation, or enact what the Constitution forbids the legislature to enact.",
    window: null,
    outcome:
      "The measure goes on the ballot of the first statewide election held more than 120 days after the next legislative session adjourns; it is enacted if more than half of those voting in that general election vote for it.",
    source: {
      title: "Constitution of the State of Wyoming",
      provision: "Article 3, Section 52",
      url: "https://wyoleg.gov/statutes/compress/Title97.pdf",
      readOn: "2026-11-06",
    },
  },
];

/** The routes an amendment to an act of this authority and kind can take. */
export const routesFor = (authority: string, kind: string): OfficialRoute[] =>
  OFFICIAL_ROUTES.filter(
    (r) => r.authority === authority && (r.appliesTo as readonly string[]).includes(kind),
  );
