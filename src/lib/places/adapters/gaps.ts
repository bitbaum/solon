/**
 * Gaps in a source that reads many countries at once. A line per country and
 * year would be thousands; a line per series names the countries asked for
 * that the publisher gave no value at all, which is how a country it stopped
 * covering, or a code it renamed, shows in the run's report.
 */
export function countryGaps(asked: readonly string[], fromYear: number) {
  const answered = new Map<string, Set<string>>();
  return {
    /** A series this retrieval holds: reported even if no asked country has a value in it. */
    series(series: string) {
      if (!answered.has(series)) answered.set(series, new Set());
    },
    /** A country has a value in the series. */
    value(series: string, code: string) {
      this.series(series);
      answered.get(series)!.add(code);
    },
    report(publisher: string, skip: (row: string, reason: string) => void) {
      for (const [series, codes] of answered) {
        const silent = asked.filter((code) => !codes.has(code));
        if (silent.length > 0) {
          skip(
            series,
            `${publisher} publishes no value from ${fromYear} on for ${silent.join(", ")}`,
          );
        }
      }
    },
  };
}
