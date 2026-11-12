/**
 * Give every existing human seat its person tag.
 *
 * Seats created before person tags existed have none, so the one-person
 * one-seat rule has nothing to compare a new seat with. This asks OrangeCat
 * for each such seat's tag and stores it. Safe to run again: it only touches
 * seats without a tag.
 *
 * If two human seats that are not retired in one organization turn out to be one person's,
 * the second cannot be stored (the unique index refuses it). The script does
 * not choose between them: it prints both and leaves the second untagged, for
 * the organization to decide.
 *
 *   pnpm exec tsx scripts/backfill-person-tags.ts            # do it
 *   pnpm exec tsx scripts/backfill-person-tags.ts --dry-run  # only report
 */
import { parseArgs } from "node:util";
import { and, eq, isNotNull, isNull, ne } from "drizzle-orm";
import { MemberStatus, MemberType } from "../src/lib/db/enums";
import { db } from "../src/lib/db/client";
import { members } from "../src/lib/db/schema";
import { personTagFor } from "../src/lib/orangecat-person";

const { values } = parseArgs({ options: { "dry-run": { type: "boolean", default: false } } });

async function main() {
  const seats = await db.query.members.findMany({
    where: and(
      eq(members.memberType, MemberType.HUMAN),
      ne(members.status, MemberStatus.RETIRED),
      isNotNull(members.ocActorId),
      isNull(members.personTag),
    ),
    columns: { id: true, organizationId: true, displayName: true, ocActorId: true },
  });
  let stored = 0;
  let none = 0;
  let failed = 0;
  let clashes = 0;

  for (const seat of seats) {
    const answer = await personTagFor(seat.ocActorId, seat.organizationId);
    if (!answer.ok) {
      failed++;
      console.error(`could not ask for ${seat.id} (${seat.displayName}): ${answer.reason}`);
      continue;
    }
    if (!answer.tag) {
      none++;
      continue;
    }
    const other = await db.query.members.findFirst({
      where: and(
        eq(members.organizationId, seat.organizationId),
        eq(members.personTag, answer.tag),
        eq(members.memberType, MemberType.HUMAN),
        ne(members.status, MemberStatus.RETIRED),
      ),
      columns: { id: true, displayName: true },
    });
    if (other) {
      clashes++;
      console.error(
        `ONE PERSON, TWO SEATS in organization ${seat.organizationId}: "${other.displayName}" (${other.id}) and "${seat.displayName}" (${seat.id}). Left untagged; the organization decides.`,
      );
      continue;
    }
    if (!values["dry-run"]) {
      await db.update(members).set({ personTag: answer.tag }).where(eq(members.id, seat.id));
    }
    stored++;
  }

  console.log(
    `${values["dry-run"] ? "would store" : "stored"} ${stored}; cannot be told apart ${none}; could not ask ${failed}; one person in two seats ${clashes}; of ${seats.length} untagged human seats.`,
  );
  process.exit(failed > 0 || clashes > 0 ? 1 : 0);
}

void main();
