import { and, count, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  AuditEventType,
  KeyCustody,
  MemberStatus,
  MemberType,
  auditEvents,
  members,
  organizations,
} from "@/lib/db/schema";
import { registrationMessage, verifyMessage } from "@/lib/bitcoin/message";

export interface RegisterMemberInput {
  orgSlug: string;
  /** OrangeCat actor id from the session — never taken from the request body. */
  actorId: string;
  displayName: string;
  /**
   * Optional: a Bitcoin key to sign with, proven by a signature over
   * registrationMessage(). Without one the seat is held by the OrangeCat
   * identity alone, and the member acts by being signed in.
   */
  key?: { address: string; signature: string } | null;
}

export interface RegisterMemberResult {
  registered: boolean;
  verified: boolean;
  genesis?: boolean;
  reason?: string;
  memberId?: string;
}

const activeHumansOf = (organizationId: string) =>
  and(
    eq(members.organizationId, organizationId),
    eq(members.memberType, MemberType.HUMAN),
    eq(members.status, MemberStatus.ACTIVE),
  );

/**
 * Why this exists at all: `MEMBERSHIP` is a HUMANS_ONLY category, and
 * `openSession` refuses an empty electorate. With zero human members, a
 * membership vote can therefore never open — so no human could ever be
 * admitted through governance. The roster was closed by construction, and the
 * only way in was an operator with database access.
 *
 * The founding seat is the one admission that cannot itself be voted on, so it
 * is granted on proof rather than by decision: the first recognized OrangeCat
 * identity to claim it becomes the founding member (with a Bitcoin key if they
 * choose to add one), and that grant is written into the append-only audit trail where
 * anyone can see it happened and when. Every later admission is an ordinary
 * MEMBERSHIP vote by the humans already seated — the genesis branch is closed
 * permanently by its own success, because it only fires while the human roster
 * is empty.
 */
export async function registerMember(input: RegisterMemberInput): Promise<RegisterMemberResult> {
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.slug, input.orgSlug),
  });
  if (!org) return { registered: false, verified: false, reason: "organization not found" };

  const key = input.key ?? null;
  if (key) {
    const message = registrationMessage({
      orgSlug: input.orgSlug,
      actorId: input.actorId,
      memberAddress: key.address,
    });
    const verification = verifyMessage(message, key.address, key.signature);
    if (!verification.valid) {
      return {
        registered: false,
        verified: false,
        reason: verification.reason ?? "signature does not match the address",
      };
    }
  }

  // One actor holds at most one seat in an organization, and one address is at
  // most one member of it. Both are checked before the genesis race so a
  // double-submit is a no-op rather than a second founding seat. The actor
  // check is per organization, not global: the same person may sit on the
  // rosters of several organizations, one seat each.
  const existingByActor = await db.query.members.findFirst({
    where: and(eq(members.organizationId, org.id), eq(members.ocActorId, input.actorId)),
  });
  if (existingByActor) {
    return {
      registered: false,
      verified: true,
      reason: "this OrangeCat account already holds a seat in this organization",
      memberId: existingByActor.id,
    };
  }
  const existingByAddress = key
    ? await db.query.members.findFirst({
        where: and(eq(members.organizationId, org.id), eq(members.bitcoinAddress, key.address)),
      })
    : null;
  if (existingByAddress) {
    return {
      registered: false,
      verified: true,
      reason: "this Bitcoin address is already registered to a member",
    };
  }

  const [{ humanCount }] = await db
    .select({ humanCount: count() })
    .from(members)
    .where(activeHumansOf(org.id));
  if (humanCount > 0) {
    return {
      registered: false,
      verified: true,
      reason:
        "the founding seat is taken — further admissions are decided by a MEMBERSHIP vote of the seated members",
    };
  }

  // The count and the insert must be one atomic step: two people submitting at
  // the same instant would otherwise both read zero and both be seated.
  // `bitcoinAddress` and `ocActorId` are each unique per organization, so the
  // second writer of an identical pair fails; the count is re-read inside the
  // transaction to close the distinct-pair race the constraints cannot catch.
  try {
    const member = await db.transaction(async (tx) => {
      const [{ stillEmpty }] = await tx
        .select({ stillEmpty: count() })
        .from(members)
        .where(activeHumansOf(org.id));
      if (stillEmpty > 0) throw new Error("GENESIS_TAKEN");

      const [created] = await tx
        .insert(members)
        .values({
          organizationId: org.id,
          displayName: input.displayName,
          memberType: MemberType.HUMAN,
          keyCustody: key ? KeyCustody.SELF : null,
          bitcoinAddress: key?.address ?? null,
          ocActorId: input.actorId,
          status: MemberStatus.ACTIVE,
        })
        .returning();
      await tx.insert(auditEvents).values({
        organizationId: org.id,
        eventType: AuditEventType.MEMBER_ADDED,
        actorMemberId: created.id,
        subjectType: "member",
        subjectId: created.id,
        payload: {
          displayName: created.displayName,
          memberType: MemberType.HUMAN,
          bitcoinAddress: created.bitcoinAddress,
          genesis: true,
          note: key
            ? "founding human seat — claimed by a recognized OrangeCat identity that also proved control of this Bitcoin key, because a membership vote cannot open with an empty human electorate. Later admissions go through MEMBERSHIP votes."
            : "founding human seat — claimed by a recognized OrangeCat identity (no Bitcoin key), because a membership vote cannot open with an empty human electorate. Later admissions go through MEMBERSHIP votes.",
        },
      });
      return created;
    });
    return { registered: true, verified: true, genesis: true, memberId: member.id };
  } catch (e) {
    const taken = e instanceof Error && e.message === "GENESIS_TAKEN";
    return {
      registered: false,
      verified: true,
      reason: taken
        ? "the founding seat was claimed a moment ago — further admissions go through a MEMBERSHIP vote"
        : "registration failed",
    };
  }
}

/** Is the founding seat still unclaimed? Drives what /join offers. */
export async function genesisOpen(orgSlug: string): Promise<boolean> {
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.slug, orgSlug),
  });
  if (!org) return false;
  const [{ humanCount }] = await db
    .select({ humanCount: count() })
    .from(members)
    .where(activeHumansOf(org.id));
  return humanCount === 0;
}
