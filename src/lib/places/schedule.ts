/**
 * Which sources a scheduled run fetches on a day (design §8.2: "cadence is
 * config, so the scheduler reads it"). The box's timer calls the run once a
 * day; a source's cadence decides on which days it is fetched. Its minute and
 * hour fields are not read: the timer owns the time of day.
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

/**
 * Sources a daily run loads for the first time, whatever their cadence: a
 * source added after its day of the month would otherwise wait for it, and a
 * source never loaded would never catch up. At most `limit` a day, in
 * registry order, so a batch of new sources (a country each) arrives over a
 * few days and no publisher sees a burst. `loaded` holds the keys of sources
 * with an applied run.
 */
export const FIRST_LOADS_PER_RUN = 40;

export const firstLoads = (
  config: PlacesConfig,
  loaded: ReadonlySet<string>,
  isoDate: string,
  fetchable: (source: Source) => boolean,
  limit = FIRST_LOADS_PER_RUN,
): Source[] =>
  config.sources
    .filter((s) => fetchable(s) && !loaded.has(s.key) && !dueOn(s.cadence, isoDate))
    .slice(0, limit);
