/**
 * The founding seat is the one admission granted on proof rather than by a
 * vote, so it is also the one that must be impossible to grant twice. These
 * cover the properties that make it safe: a real signature is required, the
 * signature is bound to the OrangeCat identity, and the branch closes the
 * instant it succeeds.
 *
 * Runs only with INTEGRATION=1 against a migrated database (same harness as
 * the vote spine). Plain `npm test` skips it.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { MemberStatus, MemberType } from "@/lib/db/enums";
import { db } from "@/lib/db/client";
import { auditEvents, members, organizations } from "@/lib/db/schema";
import { generateKeyPair, registrationMessage, signMessage } from "@/lib/bitcoin/message";
import { genesisOpen, registerMember, unfoundedOrganizations } from "@/lib/domain/membership";

const RUN = process.env.INTEGRATION === "1";

async function freshOrg() {
  const slug = `mem-${randomUUID().slice(0, 8)}`;
  await db.insert(organizations).values({ slug, name: "Membership Test Org" });
  return slug;
}

function claim(slug: string, actorId: string) {
  const pair = generateKeyPair();
  const message = registrationMessage({
    orgSlug: slug,
    actorId,
    memberAddress: pair.address,
  });
  return {
    pair,
    input: {
      orgSlug: slug,
      actorId,
      displayName: "Claimant",
      key: { address: pair.address, signature: signMessage(message, pair.privateKeyHex) },
    },
  };
}

describe.runIf(RUN)("founding seat", () => {
  // The seat belongs to the identity the deployment names. Each test names its
  // own claimant so the old "first to press the button" rule cannot pass by
  // accident.
  const saved = process.env.SOLON_FOUNDER_ACTOR_ID;
  const founder = `actor-${randomUUID()}`;
  beforeEach(() => {
    process.env.SOLON_FOUNDER_ACTOR_ID = founder;
  });
  afterEach(() => {
    if (saved === undefined) delete process.env.SOLON_FOUNDER_ACTOR_ID;
    else process.env.SOLON_FOUNDER_ACTOR_ID = saved;
  });

  it("is closed to everyone while no founder is named", async () => {
    delete process.env.SOLON_FOUNDER_ACTOR_ID;
    const slug = await freshOrg();
    expect(await genesisOpen(slug)).toBe(true);
    const anyone = claim(slug, `actor-${randomUUID()}`);
    const refused = await registerMember(anyone.input);
    expect(refused).toMatchObject({ registered: false, verified: true });
    expect(refused.reason).toMatch(/doesn't have its first member yet/);
    expect(await genesisOpen(slug)).toBe(true);
  });

  it("refuses everyone but the named founder", async () => {
    const slug = await freshOrg();
    const stranger = claim(slug, `actor-${randomUUID()}`);
    const refused = await registerMember(stranger.input);
    expect(refused).toMatchObject({ registered: false, verified: true });
    expect(refused.reason).toMatch(/waiting for its founder/);
    expect(await genesisOpen(slug)).toBe(true);
  });

  it("seats the named founder on a valid signature and closes the branch", async () => {
    const slug = await freshOrg();
    expect(await genesisOpen(slug)).toBe(true);

    const first = claim(slug, founder);
    const seated = await registerMember(first.input);
    expect(seated).toMatchObject({ registered: true, verified: true, genesis: true });

    const member = await db.query.members.findFirst({
      where: eq(members.id, seated.memberId!),
    });
    if (!member) throw new Error("seated member missing");
    expect(member.memberType).toBe(MemberType.HUMAN);
    expect(member.status).toBe(MemberStatus.ACTIVE);

    // The grant is on the record, flagged as what it is.
    const event = await db.query.auditEvents.findFirst({
      where: and(eq(auditEvents.subjectId, member.id), eq(auditEvents.subjectType, "member")),
    });
    expect((event?.payload as { genesis?: boolean })?.genesis).toBe(true);

    // And the branch is now closed — even to the founder's own second claim.
    expect(await genesisOpen(slug)).toBe(false);
    process.env.SOLON_FOUNDER_ACTOR_ID = `actor-${randomUUID()}`;
    const second = claim(slug, process.env.SOLON_FOUNDER_ACTOR_ID);
    const refused = await registerMember(second.input);
    expect(refused.registered).toBe(false);
    expect(refused.verified).toBe(true);
    expect(refused.reason).toMatch(/already has members/);
  });

  it("lists an organization as unfounded until its first member joins", async () => {
    const slug = await freshOrg();
    expect((await unfoundedOrganizations()).map((o) => o.slug)).toContain(slug);
    await registerMember(claim(slug, founder).input);
    expect((await unfoundedOrganizations()).map((o) => o.slug)).not.toContain(slug);
  });

  it("refuses a signature that does not match the claimed address", async () => {
    const slug = await freshOrg();
    const honest = claim(slug, founder);
    const impostor = generateKeyPair();

    const result = await registerMember({
      ...honest.input,
      // signature was made by a different key
      key: { address: impostor.address, signature: honest.input.key.signature },
    });
    expect(result).toMatchObject({ registered: false, verified: false });
    expect(await genesisOpen(slug)).toBe(true);
  });

  it("will not let a signature be replayed under a different OrangeCat identity", async () => {
    const slug = await freshOrg();
    const victim = claim(slug, founder);

    // Same address, same signature, attacker's actor id: the actor is inside
    // the signed text, so the signature no longer verifies.
    const stolen = await registerMember({
      ...victim.input,
      actorId: `actor-${randomUUID()}`,
    });
    expect(stolen).toMatchObject({ registered: false, verified: false });
    expect(await genesisOpen(slug)).toBe(true);
  });

  it("does not seat the same actor or address twice", async () => {
    const slug = await freshOrg();
    const first = claim(slug, founder);
    await registerMember(first.input);

    const again = await registerMember(first.input);
    expect(again.registered).toBe(false);
    // Seats are per organization now, so the refusal names this organization's roster.
    expect(again.reason).toMatch(/already holds a seat|already registered|already has members/);

    const count = await db.$count(members, eq(members.bitcoinAddress, first.pair.address));
    expect(count).toBe(1);
  });
});
