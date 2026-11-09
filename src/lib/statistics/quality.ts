/**
 * Is a series fit to be read? A report computed from the figures themselves,
 * shown beside every chart and run from the command line: what years it covers,
 * the years missing in between, any step between neighbouring years that is
 * large for that series, how stale it is, and how much of it the publisher calls
 * provisional. It decides nothing and blocks nothing: a flagged figure is shown
 * with its flag, and a person looks.
 */
import type { PlaceSeries } from "./read";

export interface QualityNote {
  kind: "gap" | "jump" | "stale" | "provisional" | "short";
  /** The years or year concerned, for the reader and for a link. */
  years: number[];
  /** What the flag compares, in numbers (a jump's size, a gap's length). */
  detail: Record<string, number>;
}

export interface SeriesQuality {
  code: string;
  from: number;
  to: number;
  count: number;
  notes: QualityNote[];
}

/** A step is large when it is this many times the series' typical step (and not tiny in itself). */
export const JUMP_FACTOR = 4;
/** A series whose latest year is more than this many years old is stale. */
export const STALE_AFTER_YEARS = 3;
/** Fewer points than this is too short to judge a jump against. */
const MIN_FOR_JUMPS = 6;

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
};

/**
 * Reads one place's series. A jump is a step between neighbouring years that
 * is at least `JUMP_FACTOR` times the median step of the series and at least a
 * tenth of the series' own spread, so a series that barely moves is not flagged
 * for moving a little, and a real change (a tax rate set by law) is flagged
 * for a person to confirm, not discarded.
 */
export function assessSeries(series: PlaceSeries, thisYear: number): SeriesQuality {
  const points = [...series.points].sort((a, b) => a.year - b.year);
  const notes: QualityNote[] = [];
  const first = points[0]?.year ?? thisYear;
  const last = points.at(-1)?.year ?? thisYear;

  const have = new Set(points.map((p) => p.year));
  const missing: number[] = [];
  for (let y = first; y <= last; y += 1) if (!have.has(y)) missing.push(y);
  if (missing.length > 0) {
    notes.push({ kind: "gap", years: missing, detail: { missing: missing.length } });
  }

  if (points.length >= MIN_FOR_JUMPS) {
    const steps = points.slice(1).map((p, i) => ({
      year: p.year,
      size: Math.abs(p.value - points[i]!.value),
      across: p.year - points[i]!.year,
    }));
    const typical = median(steps.map((s) => s.size));
    const values = points.map((p) => p.value);
    const spread = Math.max(...values) - Math.min(...values);
    const big = steps.filter(
      (s) => s.across === 1 && s.size >= Math.max(JUMP_FACTOR * typical, spread / 10) && s.size > 0,
    );
    if (big.length > 0) {
      notes.push({
        kind: "jump",
        years: big.map((s) => s.year),
        detail: { largest: Math.max(...big.map((s) => s.size)), typical },
      });
    }
  } else if (points.length > 0) {
    notes.push({ kind: "short", years: [first, last], detail: { points: points.length } });
  }

  if (thisYear - last > STALE_AFTER_YEARS) {
    notes.push({ kind: "stale", years: [last], detail: { yearsOld: thisYear - last } });
  }
  const soft = points.filter((p) => p.quality !== "normal").map((p) => p.year);
  if (soft.length > 0) {
    notes.push({ kind: "provisional", years: soft, detail: { count: soft.length } });
  }
  return { code: series.code, from: first, to: last, count: points.length, notes };
}
