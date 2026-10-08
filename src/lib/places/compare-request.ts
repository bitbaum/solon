/**
 * Which places a comparison is asked for — one rule for the /compare page and
 * the /api/v1/places/compare endpoint: each `p` is a place's slug path, blanks
 * and repeats are dropped, and no more than the register's compare limit are
 * taken, in the order asked.
 */
export function comparedPaths(
  p: string | readonly string[] | null | undefined,
  limit: number,
): string[] {
  const asked = Array.isArray(p) ? p : p ? [p as string] : [];
  return [...new Set(asked.map((path) => path.trim()).filter(Boolean))].slice(0, limit);
}

/** A day as the comparison reads it: an ISO date, or null when `on` is not one. */
export function comparedDay(on: string | null | undefined, today: string): string | null {
  const day = on ?? today;
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
}
