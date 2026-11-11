/**
 * The figures a place's profile shows: few, and each one a reader would act
 * on. What the state takes and spends, how it is governed as measured from
 * outside, how safe it is. Policy in config: the page shows a figure only
 * where the place has a value, and adding one is a line here.
 *
 * `metrics` are tried in order and the first the place holds is shown: an
 * OECD series where the country reports to the OECD, the World Bank's where
 * one measures the same thing for every other.
 */
export const PROFILE_FIGURE_GROUPS = ["state", "governance", "safety"] as const;
export type ProfileFigureGroup = (typeof PROFILE_FIGURE_GROUPS)[number];

export interface ProfileFigure {
  key: string;
  group: ProfileFigureGroup;
  metrics: readonly string[];
}

export const PROFILE_FIGURES: readonly ProfileFigure[] = [
  { key: "taxes", group: "state", metrics: ["tax.revenue.general"] },
  {
    key: "spending",
    group: "state",
    // All spending where the OECD reports it; else the World Bank's government consumption, a
    // narrower measure (no transfers) under its own label, so the card says which it is.
    metrics: ["economy.government.expenditure", "economy.government.consumption"],
  },
  { key: "topRate", group: "state", metrics: ["tax.income.top_rate"] },
  { key: "wedge", group: "state", metrics: ["tax.wedge.average"] },
  { key: "voice", group: "governance", metrics: ["governance.wgi.voice"] },
  { key: "ruleOfLaw", group: "governance", metrics: ["governance.wgi.rule_of_law"] },
  { key: "corruption", group: "governance", metrics: ["governance.wgi.corruption"] },
  { key: "effectiveness", group: "governance", metrics: ["governance.wgi.effectiveness"] },
  { key: "homicide", group: "safety", metrics: ["crime.homicide.rate"] },
];

/** The places a figure is ranked among: the countries, by the scheme every one of them carries. */
export const PROFILE_PEERS_SCHEME = "iso_3166_1";

/** Years of a figure's trend a profile draws. */
export const PROFILE_TREND_YEARS = 15;

/** Fewer peers than this and a rank says nothing: the position is left out. */
export const PROFILE_MIN_PEERS = 20;
