/**
 * One person, one human seat per organization.
 *
 * A seat goes to an account. A person on OrangeCat can hold several accounts
 * (identities), so the account alone does not say whether two seats are one
 * person's. OrangeCat's person tag does (src/lib/orangecat-person.ts), and
 * this file is where Solon uses it:
 *
 *  - `seatHeldByPerson` asks, before a seat is given: does this person already
 *    sit here? It is what an admission must call, and the operator's
 *    add-member script does.
 *  - `recordPersonTag` stores the tag on a seat that was just created, so the
 *    NEXT admission has something to compare with.
 *
 * The rule itself is the unique index on (organization, person_tag) for
 * human seats that are not retired. These functions give it a sentence; the index is what
 * cannot be skipped.
 */
import { and, eq, ne } from "drizzle-orm";
import { MemberStatus, MemberType } from "@/lib/db/enums";
import { db } from "@/lib/db/client";
import { members } from "@/lib/db/schema";
import { personTagFor, type PersonTagAnswer, type PersonTagDeps } from "@/lib/orangecat-person";

export type PersonSeatCheck =
  /** `tag` is what to store on the new seat; null when the account cannot be told apart. */
  | { ok: true; tag: string | null }
  /** The person already holds a seat here, under another of their accounts. */
  | { ok: false; reason: "already_seated"; memberId: string; displayName: string }
  /** OrangeCat could not be asked. Not a "no": the caller must not seat on it either. */
  | { ok: false; reason: "unavailable"; detail: string };

/** Would seating this account give its person a second seat here? */
export async function seatHeldByPerson(
  organizationId: string,
  actorId: string | null | undefined,
  deps: PersonTagDeps = {},
): Promise<PersonSeatCheck> {
  const answer: PersonTagAnswer = await personTagFor(actorId, organizationId, deps);
  if (!answer.ok) return { ok: false, reason: "unavailable", detail: answer.reason };
  if (!answer.tag) return { ok: true, tag: null };

  const existing = await db.query.members.findFirst({
    where: and(
      eq(members.organizationId, organizationId),
      eq(members.personTag, answer.tag),
      eq(members.memberType, MemberType.HUMAN),
      ne(members.status, MemberStatus.RETIRED),
    ),
    columns: { id: true, displayName: true },
  });
  if (existing) {
    return {
      ok: false,
      reason: "already_seated",
      memberId: existing.id,
      displayName: existing.displayName,
    };
  }
  return { ok: true, tag: answer.tag };
}

/**
 * Store the person tag on a seat that already exists. For the two seats that
 * are created with nobody else on the human roster (an organization's founder,
 * and the founding seat of the first one), where no clash is possible and the
 * seat must not wait on another service. Never throws: a seat without a tag is
 * a seat the backfill picks up (scripts/backfill-person-tags.ts).
 */
export async function recordPersonTag(
  memberId: string,
  organizationId: string,
  actorId: string | null | undefined,
  deps: PersonTagDeps = {},
): Promise<"stored" | "none" | "failed"> {
  try {
    const answer = await personTagFor(actorId, organizationId, deps);
    if (!answer.ok) return "failed";
    if (!answer.tag) return "none";
    await db.update(members).set({ personTag: answer.tag }).where(eq(members.id, memberId));
    return "stored";
  } catch (error) {
    console.error("[person-seat] could not record a person tag", { memberId, error });
    return "failed";
  }
}
