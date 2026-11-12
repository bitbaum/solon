/**
 * Give every existing human seat its person tag, or check the ones stored.
 *
 * Seats created before person tags existed have none, so the one-person
 * one-seat rule has nothing to compare a new seat with. This asks OrangeCat
 * for such seats' tags, one request per organization per hundred seats, and
 * stores them. Safe to run again: by default it only touches seats without a
 * tag.
 *
 * --refresh asks again for EVERY human seat that is not retired and rewrites
 * the tags that changed. A tag changes when an identity is handed over to
 * another person on OrangeCat; one OrangeCat now leaves out is cleared.
 *
 * If two human seats that are not retired in one organization turn out to be
 * one person's, the script does not choose between them: the first keeps (or
 * gets) the tag, the others are left untagged, and it prints them all for the
 * organization to decide. --dry-run finds the same clashes without writing.
 *
 *   pnpm exec tsx scripts/backfill-person-tags.ts            # do it
 *   pnpm exec tsx scripts/backfill-person-tags.ts --dry-run  # only report
 *   pnpm exec tsx scripts/backfill-person-tags.ts --refresh  # re-check every tag
 *
 * Needs ORANGECAT_OAUTH_CLIENT_ID and ORANGECAT_OAUTH_CLIENT_SECRET: without
 * them every seat is "could not ask" and the script exits 1.
 */
import { parseArgs } from "node:util";
import { db } from "../src/lib/db/client";
import { backfillPersonTags } from "../src/lib/domain/person-seat";

const { values } = parseArgs({
  options: {
    "dry-run": { type: "boolean", default: false },
    refresh: { type: "boolean", default: false },
  },
});

async function main() {
  const dryRun = values["dry-run"];
  const report = await backfillPersonTags({ dryRun, refresh: values.refresh });

  for (const { organizationId, reason } of report.failures) {
    console.error(`could not ask for the seats of organization ${organizationId}: ${reason}`);
  }
  for (const { organizationId, clash } of report.clashes) {
    const [kept, ...others] = clash.seats;
    console.error(
      `ONE PERSON, SEVERAL SEATS in organization ${organizationId}: "${kept!.displayName}" (${kept!.memberId}) keeps the tag; ${others
        .map((s) => `"${s.displayName}" (${s.memberId})`)
        .join(", ")} left untagged. The organization decides.`,
    );
  }
  const verb = dryRun ? "would" : "did";
  console.log(
    `${verb} store ${report.stored}, ${verb} rewrite ${report.rewritten}, ${verb} clear ${report.cleared}; cannot be told apart ${report.none}; could not ask ${report.failed}; seats in a clash ${report.clashes.reduce((n, c) => n + c.clash.seats.length, 0)}; of ${report.asked} human seats asked about${values.refresh ? "" : " (untagged only)"}.`,
  );
  process.exitCode = report.failed > 0 || report.clashes.length > 0 ? 1 : 0;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$client.end());
