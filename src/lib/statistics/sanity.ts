/**
 * Does this chart make sense? Checks on what is about to be drawn, run on the
 * page's own figures: a value that cannot be real is withheld and said so; a
 * comparison that would mislead (places read at different years, a trend from
 * two points, a pattern from three dots) carries a warning above the chart.
 * Nothing here is a verdict on the data's subject, only on whether the picture
 * can bear the weight a reader would put on it. Pure, so pages, scripts and
 * tests read one answer.
 */
import type { ScatterPoint } from "./compare";
import type { PlaceSeries } from "./read";

export type SanityKind =
  | "non_finite"
  | "implausible"
  | "year_spread"
  | "short_series"
  | "constant_series"
  | "few_places"
  | "thin_scatter"
  | "scatter_years";

export interface SanityFinding {
  kind: SanityKind;
  /** A value that cannot be real is withheld from the chart; the rest only warn. */
  severity: "withheld" | "warn";
  /** The places concerned, by name. */
  places: string[];
  years: number[];
  detail: Record<string, number | string>;
}

/** Places whose latest figures are more than this many years apart are not read at one date. */
export const MAX_YEAR_SPREAD = 2;
/** Fewer figures than this is not a trend. */
export const MIN_POINTS_FOR_TREND = 3;
/**
 * This many equal figures in a row, running up to the latest year, look like a
 * value carried forward rather than measured. A rate fixed by law can stay put
 * for years, so a run that ends earlier is not flagged.
 */
export const CONSTANT_RUN = 10;
/** Fewer points than this shows no pattern worth a line through it. */
export const MIN_SCATTER_POINTS = 5;
/** A ranking or a map of fewer places than this says little. */
export const MIN_PLACES_FOR_RANKING = 3;

export interface Band {
  min: number;
  max: number;
}

/**
 * Takes out of each series any figure that is not a finite number or lies
 * outside the metric's plausible band (the band the importer already holds
 * figures to, applied again at the point of drawing), and reports each place
 * it touched. Everything else is left exactly as it is.
 */
export function screenSeries(
  plausible: Band | undefined,
  series: readonly PlaceSeries[],
): { series: PlaceSeries[]; findings: SanityFinding[] } {
  const findings: SanityFinding[] = [];
  const kept = series.map((s) => {
    const bad = { non_finite: [] as number[], implausible: [] as number[] };
    const points = s.points.filter((p) => {
      if (!Number.isFinite(p.value)) {
        bad.non_finite.push(p.year);
        return false;
      }
      if (plausible && (p.value < plausible.min || p.value > plausible.max)) {
        bad.implausible.push(p.year);
        return false;
      }
      return true;
    });
    for (const kind of ["non_finite", "implausible"] as const) {
      if (bad[kind].length > 0) {
        findings.push({
          kind,
          severity: "withheld",
          places: [s.name],
          years: bad[kind],
          detail:
            plausible && kind === "implausible" ? { min: plausible.min, max: plausible.max } : {},
        });
      }
    }
    return points.length === s.points.length ? s : { ...s, points };
  });
  return { series: kept, findings };
}

/** The checks that need the places side by side: what is drawn, and what a ranking compares. */
export function checkSeries(
  series: readonly PlaceSeries[],
  options: { fixedByLaw?: boolean } = {},
): SanityFinding[] {
  const findings: SanityFinding[] = [];
  const withPoints = series.filter((s) => s.points.length > 0);

  const latest = withPoints.map((s) => ({ name: s.name, year: s.points.at(-1)!.year }));
  if (latest.length > 1) {
    const years = latest.map((l) => l.year);
    const spread = Math.max(...years) - Math.min(...years);
    if (spread > MAX_YEAR_SPREAD) {
      findings.push({
        kind: "year_spread",
        severity: "warn",
        places: latest
          .filter((l) => l.year < Math.max(...years) - MAX_YEAR_SPREAD)
          .map((l) => l.name),
        years: [Math.min(...years), Math.max(...years)],
        detail: { spread },
      });
    }
  }

  for (const s of withPoints) {
    if (s.points.length < MIN_POINTS_FOR_TREND) {
      findings.push({
        kind: "short_series",
        severity: "warn",
        places: [s.name],
        years: s.points.map((p) => p.year),
        detail: { points: s.points.length },
      });
    }
    let run = 1;
    for (let i = s.points.length - 1; i > 0; i -= 1) {
      if (s.points[i]!.value !== s.points[i - 1]!.value) break;
      run += 1;
    }
    const longest = run;
    if (longest >= CONSTANT_RUN && !options.fixedByLaw) {
      findings.push({
        kind: "constant_series",
        severity: "warn",
        places: [s.name],
        years: [s.points.at(-longest)!.year, s.points.at(-1)!.year],
        detail: { run: longest },
      });
    }
  }

  if (withPoints.length > 0 && withPoints.length < MIN_PLACES_FOR_RANKING) {
    findings.push({
      kind: "few_places",
      severity: "warn",
      places: withPoints.map((s) => s.name),
      years: [],
      detail: { places: withPoints.length },
    });
  }
  return findings;
}

/** Two measures against each other: too few dots to read a pattern, or dots from different years. */
export function checkScatter(points: readonly ScatterPoint[]): SanityFinding[] {
  const findings: SanityFinding[] = [];
  if (points.length > 0 && points.length < MIN_SCATTER_POINTS) {
    findings.push({
      kind: "thin_scatter",
      severity: "warn",
      places: points.map((p) => p.name),
      years: [],
      detail: { points: points.length },
    });
  }
  const years = points.map((p) => p.year);
  if (years.length > 1 && Math.max(...years) - Math.min(...years) > MAX_YEAR_SPREAD) {
    findings.push({
      kind: "scatter_years",
      severity: "warn",
      places: points
        .filter((p) => p.year < Math.max(...years) - MAX_YEAR_SPREAD)
        .map((p) => p.name),
      years: [Math.min(...years), Math.max(...years)],
      detail: { spread: Math.max(...years) - Math.min(...years) },
    });
  }
  return findings;
}
