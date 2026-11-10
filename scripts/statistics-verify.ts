/**
 * Does every source the curated records, the method descriptions, the contested
 * places and the budget documents cite still say what they rely on?
 *
 *   pnpm run statistics:verify                 fetch every cited page once, check its words
 *   pnpm run statistics:verify --list          list the pages and what each is expected to say
 *   pnpm run statistics:verify --json=out.json also write the report
 *
 * Exits 1 when a page is gone, refuses the request, or no longer holds a word
 * a record expects of it. Needs no database and no secrets, so a scheduled
 * workflow runs it (.github/workflows/statistics-verify.yml).
 */
import { writeFileSync } from "node:fs";
import { BUDGET_DOCUMENTS } from "@/lib/config/budgets";
import { CONTESTS } from "@/lib/config/places/contested";
import { GAPS } from "@/lib/config/statistics/gaps";
import { METHODOLOGIES } from "@/lib/config/statistics/methodologies";
import { STATISTIC_RECORDS } from "@/lib/config/statistics/records";
import { collectEvidence, verifyEvidence } from "@/lib/statistics/verify-sources";

async function main(): Promise<number> {
  // The records, and the pages the descriptions of other publishers' methods rest on.
  const items = collectEvidence([
    ...STATISTIC_RECORDS,
    ...METHODOLOGIES.map((m) => ({ key: `method:${m.key}`, body: m }) as never),
    ...GAPS.coverage.map(
      (c) => ({ key: `gap:${c.topic}:${c.place.value}:${c.variant}`, body: c }) as never,
    ),
    // The words each side of a contested place is quoted in (design 2026-11-contested-law.md §4.3).
    ...CONTESTS.map((c) => ({ key: `contest:${c.place}`, body: c }) as never),
    // The budget laws budgets were read from (design 2026-11-budgets.md).
    ...BUDGET_DOCUMENTS.map((d) => ({ key: `budget:${d.key}`, body: d }) as never),
  ]);
  if (process.argv.includes("--list")) {
    for (const i of items) {
      console.log(
        `${i.url}\n  ${i.publisher}\n  cited by ${i.citedBy.length}; expects ${i.expect.length} word(s)`,
      );
    }
    return 0;
  }
  const results = await verifyEvidence(items);
  for (const r of results) {
    const mark = r.skipped ? "skip" : r.ok ? "ok  " : "FAIL";
    const why = r.skipped
      ? "a page for people; a program cannot read it"
      : r.ok
        ? `${r.bytes} bytes`
        : r.error
          ? r.error
          : r.status >= 400 || r.status === 0
            ? `HTTP ${r.status}`
            : `missing: ${r.missing.map((m) => JSON.stringify(m)).join(", ")}`;
    console.log(
      `${mark} ${r.url}\n     ${why}${r.ok ? "" : `\n     rests on: ${r.citedBy.join(", ")}`}`,
    );
  }
  const json = process.argv.find((a) => a.startsWith("--json="))?.slice("--json=".length);
  if (json) writeFileSync(json, JSON.stringify({ at: new Date().toISOString(), results }, null, 2));
  const failed = results.filter((r) => !r.ok);
  const skipped = results.filter((r) => r.skipped).length;
  console.log(
    `\n${results.length - failed.length - skipped} of ${results.length - skipped} readable pages check out; ${skipped} for people only`,
  );
  return failed.length > 0 ? 1 : 0;
}

main()
  .then((code) => process.exit(code))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(2);
  });
