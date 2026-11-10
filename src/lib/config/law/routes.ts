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
  {
    key: "li-law-initiative",
    authority: "li",
    name: "Popular initiative for a law",
    appliesTo: ["statute"],
    venue: "legislature",
    whoMaySign:
      "Voting citizens of Liechtenstein (Landesbürger), each signature certified by the signer's commune",
    signatures: { count: 1_000 },
    alsoRequired: [
      "Or three communes, by matching resolutions of their municipal assemblies, instead of the signatures",
      "A proposal that would burden the State with a new or lasting expense must come with a proposal to cover it",
    ],
    window: null,
    outcome:
      "The Landtag must take the proposal up at its next sitting (Art. 64 para. 2). A drafted initiative the Landtag does not accept goes to a popular vote (Volksrechtegesetz, LR 161, Art. 82).",
    source: {
      title: "Constitution of the Principality of Liechtenstein (LR 101)",
      provision: "Art. 64 paras. 1-3",
      url: "https://www.gesetze.li/konso/html/1921015000",
      readOn: "2026-10-23",
    },
  },
  {
    key: "li-constitution-initiative",
    authority: "li",
    name: "Popular initiative for the Constitution",
    appliesTo: ["constitution"],
    venue: "legislature",
    whoMaySign:
      "Voting citizens of Liechtenstein (Landesbürger), each signature certified by the signer's commune",
    signatures: { count: 1_500 },
    alsoRequired: [
      "Or four communes, by matching resolutions of their municipal assemblies, instead of the signatures",
    ],
    window: null,
    outcome:
      "The Landtag must take the proposal up at its next sitting (Art. 64 para. 2, by para. 4).",
    source: {
      title: "Constitution of the Principality of Liechtenstein (LR 101)",
      provision: "Art. 64 para. 4",
      url: "https://www.gesetze.li/konso/html/1921015000",
      readOn: "2026-10-23",
    },
  },
  {
    key: "li-law-referendum",
    authority: "li",
    name: "Referendum against a law the Landtag has passed",
    appliesTo: ["statute"],
    venue: "voters",
    whoMaySign: "Voting citizens of Liechtenstein (Landesbürger)",
    signatures: { count: 1_000 },
    alsoRequired: ["Or three communes, by matching resolutions of their municipal assemblies"],
    cannotChange:
      "A law the Landtag has declared urgent, and a financial decision below a one-off new expense of CHF 500,000 or a yearly new expense of CHF 250,000, are not subject to it",
    window: { days: 30 },
    outcome:
      "The law goes to a popular vote and takes effect only if the voters accept it (the absolute majority of valid votes cast in the whole country decides).",
    source: {
      title: "Constitution of the Principality of Liechtenstein (LR 101)",
      provision: "Art. 66 paras. 1, 4",
      url: "https://www.gesetze.li/konso/html/1921015000",
      readOn: "2026-10-23",
    },
  },
  {
    key: "li-constitution-referendum",
    authority: "li",
    name: "Referendum against a change to the Constitution",
    appliesTo: ["constitution"],
    venue: "voters",
    whoMaySign: "Voting citizens of Liechtenstein (Landesbürger)",
    signatures: { count: 1_500 },
    alsoRequired: ["Or four communes, by matching resolutions of their municipal assemblies"],
    window: { days: 30 },
    outcome: "The change goes to a popular vote and takes effect only if the voters accept it.",
    source: {
      title: "Constitution of the Principality of Liechtenstein (LR 101)",
      provision: "Art. 66 para. 2",
      url: "https://www.gesetze.li/konso/html/1921015000",
      readOn: "2026-10-23",
    },
  },
  ...[
    "li7001",
    "li7002",
    "li7003",
    "li7004",
    "li7005",
    "li7006",
    "li7007",
    "li7008",
    "li7009",
    "li7010",
    "li7011",
  ].map((authority): OfficialRoute => ({
    key: `${authority}-initiative`,
    authority,
    name: "Initiative or referendum in the municipal assembly",
    appliesTo: ["communal_act"],
    venue: "town_meeting",
    whoMaySign: "Voters of the commune",
    signatures: { percent: 16.67, of: "the commune's voters (one sixth)" },
    alsoRequired: [
      "In writing, with reasons, in the way Art. 41 describes for a referendum",
      "Only for matters Art. 41 makes subject to referendum: council decisions above the limit in the commune's Gemeindeordnung (CHF 100,000 to 300,000), and always the budget and tax surcharge, the zoning plan and building code, land sales and exchanges",
    ],
    cannotChange:
      "Not where the referendum period ran out unused or a referendum was held; for building codes, zoning plans and other general council decisions, only two years after the decision",
    window: null,
    outcome:
      "The municipal assembly deals with the matter; for a referendum against a council decision the assembly meets within four months of the filing (Art. 41 para. 5).",
    source: {
      title: "Gemeindegesetz (LR 141.0)",
      provision: "Art. 41 and Art. 42",
      url: "https://www.gesetze.li/konso/html/1996076000",
      readOn: "2026-10-23",
    },
  })),
];

/** The routes an amendment to an act of this authority and kind can take. */
export const routesFor = (authority: string, kind: string): OfficialRoute[] =>
  OFFICIAL_ROUTES.filter(
    (r) => r.authority === authority && (r.appliesTo as readonly string[]).includes(kind),
  );
