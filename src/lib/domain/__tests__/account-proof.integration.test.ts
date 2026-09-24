/**
 * Governing without Bitcoin, against a real database.
 *
 * The whole path a person with nothing but an OrangeCat account walks: found an
 * organization, file a proposal, vote, change their mind, and get a decision —
 * with every act labelled ACCOUNT on the public record, so nobody mistakes it
 * for a signature anyone can recount.
 *
 * Runs only with INTEGRATION=1 against a migrated database (same harness as the
 * vote spine). Plain `pnpm test` skips it.
 */
import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { DecisionCategory, MemberStatus, MemberType, Proof, SessionOutcome } from "@/lib/db/enums";
import { db } from "@/lib/db/client";
import { members, organizations, proposals } from "@/lib/db/schema";
import { createOrganization } from "@/lib/domain/organization";
import { createProposal } from "@/lib/domain/proposals";
import { closeSession, openSession, submitVote } from "@/lib/domain/voting";
import { decisionDocument } from "@/lib/domain/decision";

const RUN = process.env.INTEGRATION === "1";

const newActor = () => `actor-${randomUUID()}`;
const newSlug = () => `acct-${randomUUID().slice(0, 8)}`;
const account = (actorId: string) => ({ via: "account" as const, actorId });

describe.runIf(RUN)("account proof (database integration)", () => {
  it("founds, files, votes, changes a vote and decides — no Bitcoin anywhere", async () => {
    const alice = newActor();
    const bob = newActor();
    const slug = newSlug();

    const founded = await createOrganization({
      slug,
      name: "Wednesday Supper Club",
      actorId: alice,
      founderName: "Alice",
    });
    expect(founded).toMatchObject({ created: true });

    const org = await db.query.organizations.findFirst({ where: eq(organizations.slug, slug) });
    if (!org) throw new Error("organization missing");
    const founder = await db.query.members.findFirst({
      where: eq(members.id, founded.memberId!),
    });
    expect(founder).toMatchObject({ bitcoinAddress: null, keyCustody: null, ocActorId: alice });

    // A second account-only member (admission by vote is not built yet).
    await db.insert(members).values({
      organizationId: org.id,
      displayName: "Bob",
      memberType: MemberType.HUMAN,
      ocActorId: bob,
      status: MemberStatus.ACTIVE,
    });

    const filed = await createProposal({
      orgSlug: slug,
      category: DecisionCategory.OPERATIONS,
      title: "Move supper to Thursdays",
      body: "Wednesday clashes with choir.",
      by: account(alice),
    });
    expect(filed).toMatchObject({ created: true, verified: true });
    const proposal = await db.query.proposals.findFirst({
      where: eq(proposals.id, filed.proposalId!),
    });
    expect(proposal).toMatchObject({ proof: Proof.ACCOUNT, proposerSignature: null });

    const session = await openSession(filed.proposalId!);
    expect(session.eligibleCount).toBe(2);

    const yes = { method: "single_choice", choice: "yes" };
    const no = { method: "single_choice", choice: "no" };
    expect(await submitVote(session.id, { by: account(alice), ballot: no })).toMatchObject({
      stored: true,
    });
    // Changing a vote replaces it: still one ballot for Alice, now a yes.
    const changed = await submitVote(session.id, { by: account(alice), ballot: yes });
    expect(changed.tally).toMatchObject({ yes: 1, no: 0 });
    expect(await submitVote(session.id, { by: account(bob), ballot: yes })).toMatchObject({
      stored: true,
    });

    // Full participation lets it close early.
    const closed = await closeSession(session.id);
    expect(closed.outcome).toBe(SessionOutcome.APPROVED);

    const doc = await decisionDocument(session.id);
    if (!doc.found || !doc.finalized) throw new Error("decision document missing");
    const d = doc.document;
    expect(d.proposal.proof).toBe(Proof.ACCOUNT);
    expect(d.proposal.proposerMessage).toBeNull();
    expect(d.proofs.ACCOUNT).toMatch(/not an independently verifiable one/);
    expect(d.votes).toHaveLength(2);
    for (const v of d.votes) {
      expect(v.proof).toBe(Proof.ACCOUNT);
      expect(v.signature).toBeNull();
      // The record still names exactly one seat and one session.
      expect(v.signedMessage).toContain(`session:${session.id}`);
      expect(v.signedMessage).toContain(`voter:member:${v.member.id}`);
    }
  });

  it("refuses a signed-in person who holds no seat here", async () => {
    const founder = newActor();
    const slug = newSlug();
    const founded = await createOrganization({
      slug,
      name: "Closed Circle",
      actorId: founder,
      founderName: "Founder",
    });
    expect(founded.created).toBe(true);

    const result = await createProposal({
      orgSlug: slug,
      category: DecisionCategory.OPERATIONS,
      title: "Let me in",
      body: "I am not a member.",
      by: account(newActor()),
    });
    expect(result).toMatchObject({ created: false, verified: true });
    expect(result.reason).toMatch(/do not hold a seat/);
  });

  it("refuses a seat with neither a key nor an identity", async () => {
    const slug = newSlug();
    const [org] = await db.insert(organizations).values({ slug, name: "Nobody" }).returning();
    await expect(
      db.insert(members).values({
        organizationId: org.id,
        displayName: "Ghost",
        memberType: MemberType.HUMAN,
        status: MemberStatus.ACTIVE,
      }),
    ).rejects.toThrow();
  });
});
