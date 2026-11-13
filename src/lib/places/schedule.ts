/**
 * Which sources a scheduled run fetches (design §8.2: "cadence is config, so
 * the scheduler reads it"). The box's timer calls the run every hour; a
 * source's cadence names the days it is due, and the run log says whether it
 * loaded since (importQueue). Its minute and hour fields are not read: the
 * timer owns the time of day.
 */
import type { PlacesConfig, Source } from "@/lib/config/places/schema";

/** Whether one cron field (`*`, `5`, `1-5`, `*\/2`, `1,15`) allows `value`. */
function fieldAllows(field: string, value: number, min: number, max: number): boolean {
  return field.split(",").some((part) => {
    const [range, stepText] = part.split("/");
    const step = stepText === undefined ? 1 : Number(stepText);
    const [from, to] =
      range === "*"
        ? [min, max]
        : range!.includes("-")
          ? range!.split("-").map(Number)
          : [Number(range), stepText === undefined ? Number(range) : max];
    if (![step, from, to].every(Number.isInteger) || step! < 1) {
      throw new Error(`"${field}" is not a cron field this scheduler reads`);
    }
    return value >= from! && value <= to! && (value - from!) % step! === 0;
  });
}

/** Whether a five-field cron expression names the day `isoDate` (UTC). */
export function dueOn(cadence: string, isoDate: string): boolean {
  const fields = cadence.trim().split(/\s+/);
  if (fields.length !== 5) {
    throw new Error(`"${cadence}" is not a five-field cron expression`);
  }
  const [, , dayOfMonth, month, dayOfWeek] = fields as [string, string, string, string, string];
  const day = new Date(`${isoDate}T00:00:00Z`);
  const domOk = fieldAllows(dayOfMonth, day.getUTCDate(), 1, 31);
  const monthOk = fieldAllows(month, day.getUTCMonth() + 1, 1, 12);
  // Cron's own rule: 0 and 7 are both Sunday, and when both day fields are
  // restricted, either one matching is enough.
  const weekday = day.getUTCDay();
  const dowOk =
    fieldAllows(dayOfWeek, weekday, 0, 7) || (weekday === 0 && fieldAllows(dayOfWeek, 7, 0, 7));
  const dayOk = dayOfMonth !== "*" && dayOfWeek !== "*" ? domOk || dowOk : domOk && dowOk;
  return monthOk && dayOk;
}

/** The sources due on `isoDate`, in registry order (later sources may build on earlier ones). */
export const dueSources = (config: PlacesConfig, isoDate: string): Source[] =>
  config.sources.filter((source) => dueOn(source.cadence, isoDate));

/** The latest day up to `isoDate` the cadence names, looking back `maxDays`; null when none. */
export function lastDue(cadence: string, isoDate: string, maxDays = 800): string | null {
  const day = new Date(`${isoDate}T00:00:00Z`);
  for (let i = 0; i <= maxDays; i += 1) {
    const iso = day.toISOString().slice(0, 10);
    if (dueOn(cadence, iso)) return iso;
    day.setUTCDate(day.getUTCDate() - 1);
  }
  return null;
}

/** What the run log says of one source: its latest run, and how many failed in a row since it last applied. */
export interface SourceRuns {
  latest: { status: "applied" | "failed"; at: Date } | null;
  failuresInARow: number;
}

/** A failed source is tried again a day later; after three failures in a row, a week later. */
export const RETRY_AFTER_MS = 24 * 3_600_000;
export const RETRY_SLOWLY_AFTER_MS = 7 * RETRY_AFTER_MS;
export const FAILURES_BEFORE_SLOW = 3;
/**
 * A queue that runs once a day (a runner's) starts at about the same time each day, a few minutes
 * either way: a wait counted to the minute would miss the next day's run and wait for the one after.
 */
const RETRY_SLACK_MS = 2 * 3_600_000;

/**
 * The sources a run should fetch now, in registry order (later sources may
 * build on earlier ones). Read from the run log, so nothing is remembered
 * anywhere else: a source is in the queue when its latest run did not apply on
 * or after the last day its cadence names. A source never loaded is in it
 * whatever its day; a source whose publisher was down on its day stays in it
 * until it loads; one that keeps failing is tried daily, then weekly.
 */
export function importQueue(
  config: PlacesConfig,
  runs: ReadonlyMap<string, SourceRuns>,
  now: Date,
  fetchable: (source: Source) => boolean,
): Source[] {
  const today = now.toISOString().slice(0, 10);
  return config.sources.filter((source) => {
    if (!fetchable(source)) return false;
    const state = runs.get(source.key);
    if (!state?.latest) return true;
    if (state.latest.status === "failed") {
      const wait =
        state.failuresInARow >= FAILURES_BEFORE_SLOW ? RETRY_SLOWLY_AFTER_MS : RETRY_AFTER_MS;
      return now.getTime() - state.latest.at.getTime() >= wait - RETRY_SLACK_MS;
    }
    const due = lastDue(source.cadence, today);
    return due !== null && state.latest.at.toISOString().slice(0, 10) < due;
  });
}
