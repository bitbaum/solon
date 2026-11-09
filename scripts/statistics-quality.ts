/**
 * Is every statistic's series fit to be read? Prints, per statistic and place,
 * what each series covers and anything irregular in it (src/lib/statistics/quality.ts).
 *
 *   pnpm run statistics:quality             report; always exits 0
 *   pnpm run statistics:quality --strict    exit 1 when any series has a gap or is stale
 */
import { placesConfig } from "@/lib/config/places";
import { db } from "@/lib/db/client";
import { statisticMetrics } from "@/lib/statistics/present";
import { assessSeries } from "@/lib/statistics/quality";
import { loadSeries } from "@/lib/statistics/read";

const strict = process.argv.includes("--strict");

async function main(): Promise<number> {
  const thisYear = new Date().getUTCFullYear();
  let bad = 0;
  for (const metric of statisticMetrics(placesConfig)) {
    const all = await loadSeries(db, placesConfig, metric.key, "en");
    console.log(`\n${metric.key} (${all.length} place${all.length === 1 ? "" : "s"})`);
    if (all.length === 0) {
      console.log("  no figures loaded");
      continue;
    }
    for (const series of all) {
      const q = assessSeries(series, thisYear);
      const notes = q.notes.map((n) => `${n.kind} ${n.years.join(",")}`).join("; ");
      console.log(
        `  ${series.code}: ${q.count} figures ${q.from}-${q.to}${notes ? ` — ${notes}` : ""}`,
      );
      if (q.notes.some((n) => n.kind === "gap" || n.kind === "stale")) bad += 1;
    }
  }
  console.log(`\n${bad} series with a gap or stale`);
  return strict && bad > 0 ? 1 : 0;
}

main()
  .then((code) => process.exit(code))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(2);
  });
