/**
 * Who decides, against a real database.
 *
 * The three structures an organization can pick — one person decides, everyone
 * decides, elected delegates decide — walked through the real vote spine: the
 * founder's mandate at founding, the frozen mandate roll, the fall-back to the
 * members when no mandate is live, electing a delegate, and switching the
 * structure itself by decision.
 *
 * Runs only with INTEGRATION=1 against a migrated database (same harness as the
 * vote spine). Plain `pnpm test` skips it.
 */
import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import {
  AuditEventType,
  DecisionBody,
  DecisionCategory,
  MemberStatus,
  MemberType,
  SessionOutcome,
} from "@/lib/db/enums";
import { db } from "@/lib/db/client";
import { auditEvents, members, organizations } from "@/lib/db/schema";
import { createOrganization } from "@/lib/domain/organization";
import { createProposal } from "@/lib/domain/proposals";
import { closeSession, openSession, submitVote } from "@/lib/domain/voting";

const RUN = process.env.INTEGRATION === "1";

const newActor = () => `actor-${randomUUID()}`;
const newSlug = () => `gs-${randomUUID().slice(0, 8)}`;
const account = (actorId: string) => ({ via: "account" as const, actorId });
const yes = { method: "single_choice", choice: "yes" };

async function found(governanceProfile: string) {
  const founder = newActor();
  const slug = newSlug();
  const result = await createOrganization({
    slug,
    name: `Structure ${slug}`,
    actorId: founder,
    founderName: "Founder",
    governanceProfile,
  });
  expect(result).toMatchObject({ created: true });
  const org = await db.query.organizations.findFirst({ where: eq(organizations.slug, slug) });
  if (!org) throw new Error("organization missing");
  return { founder, founderSeat: result.memberId!, slug, org };
}

async function seat(organizationId: string, name: string) {
  const actorId = newActor();
  const [m] = await db
    .insert(members)
    .values({
      organizationId,
      displayName: name,
      memberType: MemberType.HUMAN,
      ocActorId: actorId,
      status: MemberStatus.ACTIVE,
    })
    .returning();
  return { actorId, memberId: m.id };
}

async function file(
  slug: string,
  by: string,
  category: DecisionCategory,
  effect?: unknown,
): Promise<string> {
  const filed = await createProposal({
    orgSlug: slug,
    category,
    title: `A ${category} decision`,
    body: "Integration.",
    by: account(by),
    ...(effect ? { effect } : {}),
  });
  expect(filed, filed.reason).toMatchObject({ created: true });
  return filed.proposalId!;
}

describe.runIf(RUN)("governance structures (database integration)", () => {
  it("refuses a structure Solon does not offer", async () => {
    const result = await createOrganization({
      slug: newSlug(),
      name: "Nope",
      actorId: newActor(),
      founderName: "Founder",
      governanceProfile: "MONARCHY",
    });
    expect(result).toMatchObject({ created: false, refusal: "invalid" });
  });

  it("one person decides: the founder holds the only mandate and alone decides", async () => {
    const { founder, founderSeat, slug, org } = await found("SOLE");
    expect(org.governanceProfile).toBe("SOLE");
    const founderRow = await db.query.members.findFirst({ where: eq(members.id, founderSeat) });
    expect(founderRow).toMatchObject({ holdsMandate: true, mandateUntil: null });

    const member = await seat(org.id, "Member");
    // Members may still propose…
    const proposalId = await file(slug, member.actorId, DecisionCategory.OPERATIONS);
    const session = await openSession(proposalId);
    expect(session).toMatchObject({ decidedBy: DecisionBody.MANDATE, eligibleCount: 1 });
    expect(session.mandateRoll).toEqual([founderSeat]);

    // …but they do not vote.
    const refused = await submitVote(session.id, { by: account(member.actorId), ballot: yes });
    expect(refused).toMatchObject({ stored: false });
    expect(refused.reason).toMatch(/mandate/);

    expect(await submitVote(session.id, { by: account(founder), ballot: yes })).toMatchObject({
      stored: true,
    });
    const closed = await closeSession(session.id);
    expect(closed.outcome).toBe(SessionOutcome.APPROVED);
  });

  it("everyone decides: no mandates, every member votes", async () => {
    const { founderSeat, slug, org } = await found("TOWN");
    const founderRow = await db.query.members.findFirst({ where: eq(members.id, founderSeat) });
    expect(founderRow?.holdsMandate).toBe(false);
    await seat(org.id, "Member");
    const session = await openSession(
      await file(slug, founderRow!.ocActorId!, DecisionCategory.OPERATIONS),
    );
    expect(session).toMatchObject({ decidedBy: DecisionBody.MEMBERS, eligibleCount: 2 });
    expect(session.mandateRoll).toBeNull();
  });

  it("elected delegates: a lapsed term hands decisions back, and members elect anew", async () => {
    const { founder, founderSeat, slug, org } = await found("DELEGATED");
    const founderRow = await db.query.members.findFirst({ where: eq(members.id, founderSeat) });
    expect(founderRow?.holdsMandate).toBe(true);
    expect(founderRow?.mandateUntil?.getTime()).toBeGreaterThan(Date.now());

    const delegate = await seat(org.id, "Delegate");

    // While the founder's term runs, operations belong to the mandate.
    const early = await openSession(await file(slug, founder, DecisionCategory.OPERATIONS));
    expect(early).toMatchObject({ decidedBy: DecisionBody.MANDATE, eligibleCount: 1 });

    // The term lapses: operations come back to the members instead of stalling.
    await db
      .update(members)
      .set({ mandateUntil: new Date(Date.now() - 1000) })
      .where(eq(members.id, founderSeat));
    const lapsed = await openSession(await file(slug, founder, DecisionCategory.OPERATIONS));
    expect(lapsed).toMatchObject({ decidedBy: DecisionBody.MEMBERS, eligibleCount: 2 });
    const opened = await db.query.auditEvents.findFirst({
      where: and(
        eq(auditEvents.subjectId, lapsed.id),
        eq(auditEvents.eventType, AuditEventType.SESSION_OPENED),
      ),
    });
    expect(opened?.payload).toMatchObject({ mandateFallback: expect.any(String) });

    // Members elect the delegate — a MEMBERSHIP decision, which stays with them.
    const election = await openSession(
      await file(slug, founder, DecisionCategory.MEMBERSHIP, {
        kind: "mandate",
        memberId: delegate.memberId,
        grant: true,
      }),
    );
    expect(election.decidedBy).toBe(DecisionBody.MEMBERS);
    await submitVote(election.id, { by: account(founder), ballot: yes });
    await submitVote(election.id, { by: account(delegate.actorId), ballot: yes });
    expect((await closeSession(election.id)).outcome).toBe(SessionOutcome.APPROVED);

    const elected = await db.query.members.findFirst({ where: eq(members.id, delegate.memberId) });
    expect(elected?.holdsMandate).toBe(true);
    // No end was named, so the profile's term applies.
    expect(elected?.mandateUntil?.getTime()).toBeGreaterThan(Date.now());

    const next = await openSession(await file(slug, founder, DecisionCategory.OPERATIONS));
    expect(next).toMatchObject({ decidedBy: DecisionBody.MANDATE, eligibleCount: 1 });
    expect(next.mandateRoll).toEqual([delegate.memberId]);
  });

  it("switches structure only through a governance-rules decision", async () => {
    const { founder, slug, org } = await found("SOLE");

    const misfiled = await createProposal({
      orgSlug: slug,
      category: DecisionCategory.OPERATIONS,
      title: "Switch quietly",
      body: "Integration.",
      by: account(founder),
      effect: { kind: "profile", profile: "TOWN" },
    });
    expect(misfiled).toMatchObject({ created: false });

    const session = await openSession(
      await file(slug, founder, DecisionCategory.GOVERNANCE_RULES, {
        kind: "profile",
        profile: "TOWN",
      }),
    );
    await submitVote(session.id, { by: account(founder), ballot: yes });
    expect((await closeSession(session.id)).outcome).toBe(SessionOutcome.APPROVED);

    const after = await db.query.organizations.findFirst({ where: eq(organizations.id, org.id) });
    expect(after?.governanceProfile).toBe("TOWN");
    const changed = await db.query.auditEvents.findFirst({
      where: and(
        eq(auditEvents.organizationId, org.id),
        eq(auditEvents.eventType, AuditEventType.PROFILE_CHANGED),
      ),
    });
    expect(changed?.payload).toMatchObject({ from: "SOLE", to: "TOWN" });
  });
});
