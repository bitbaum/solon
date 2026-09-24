/**
 * Founding an organization against a real database.
 *
 * Founding is permissionless, so the properties that make it safe are the whole
 * specification: a real signature is required; the organization, the founder's
 * seat and both audit events land together or not at all; attribution to a Loki
 * project needs Loki's grant for THIS identity; and the identity constraint was
 * relaxed exactly as far as it needed to be — several rosters, never two seats
 * on one.
 *
 * Runs only with INTEGRATION=1 against a migrated database (same harness as the
 * vote spine). Plain `pnpm test` skips it.
 */
import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { AuditEventType, KeyCustody, MemberStatus, MemberType } from "@/lib/db/enums";
import { db } from "@/lib/db/client";
import { auditEvents, members, organizations } from "@/lib/db/schema";
import {
  generateKeyPair,
  organizationMessage,
  registrationMessage,
  signMessage,
} from "@/lib/bitcoin/message";
import { signLokiGrant, type LokiGrant } from "@/lib/loki-grant";
import { genesisOpen, registerMember } from "@/lib/domain/membership";
import {
  MAX_FOUNDED_PER_ACTOR,
  createOrganization,
  listPublicOrganizations,
} from "@/lib/domain/organization";

const RUN = process.env.INTEGRATION === "1";

// Each spec file runs in its own worker process, so this does not leak into the
// other integration specs.
const SECRET = "organization-integration-secret";
process.env.SOLON_WEBHOOK_SECRET = SECRET;

const newActor = () => `actor-${randomUUID()}`;
const newSlug = () => `org-${randomUUID().slice(0, 8)}`;

function grantFor(project: string, actorId: string, expOffsetSecs = 600): LokiGrant {
  const exp = Math.floor(Date.now() / 1000) + expOffsetSecs;
  return { project, exp, sig: signLokiGrant({ project, actorId, exp }, SECRET) };
}

/** A well-formed founding. `project` builds a matching grant unless `grant` is given. */
function founding(
  opts: { actorId?: string; slug?: string; project?: string; grant?: LokiGrant } = {},
) {
  const pair = generateKeyPair();
  const actorId = opts.actorId ?? newActor();
  const slug = opts.slug ?? newSlug();
  const name = "Integration Org";
  const grant = opts.grant ?? (opts.project ? grantFor(opts.project, actorId) : null);
  const message = organizationMessage({
    slug,
    name,
    actorId,
    founderAddress: pair.address,
    project: opts.project ?? null,
  });
  return {
    pair,
    actorId,
    slug,
    input: {
      slug,
      name,
      actorId,
      founderName: "Founder",
      founderKey: { address: pair.address, signature: signMessage(message, pair.privateKeyHex) },
      grant,
    },
  };
}

async function orgRow(slug: string) {
  return db.query.organizations.findFirst({ where: eq(organizations.slug, slug) });
}

describe.runIf(RUN)("founding an organization", () => {
  it("creates the organization, seats the founder and records both events in one step", async () => {
    const f = founding();
    const result = await createOrganization(f.input);
    expect(result).toMatchObject({ created: true, verified: true, slug: f.slug });

    const org = await orgRow(f.slug);
    if (!org) throw new Error("organization missing");
    const founder = await db.query.members.findFirst({ where: eq(members.id, result.memberId!) });
    expect(founder).toMatchObject({
      organizationId: org.id,
      memberType: MemberType.HUMAN,
      keyCustody: KeyCustody.SELF,
      status: MemberStatus.ACTIVE,
      ocActorId: f.actorId,
      bitcoinAddress: f.pair.address,
    });

    const events = await db.query.auditEvents.findMany({
      where: eq(auditEvents.organizationId, org.id),
    });
    const created = events.find((e) => e.eventType === AuditEventType.ORG_CREATED);
    const seated = events.find((e) => e.eventType === AuditEventType.MEMBER_ADDED);
    expect(created).toMatchObject({ subjectType: "organization", actorMemberId: founder!.id });
    expect((seated?.payload as { genesis?: boolean }).genesis).toBe(true);

    // The seat was taken in the same transaction, so nobody else can claim it.
    expect(await genesisOpen(f.slug)).toBe(false);
  });

  it("founds nothing on a signature over different text", async () => {
    const f = founding();
    // A membership signature by the same key, over the same slug and identity.
    const wrong = signMessage(
      registrationMessage({ orgSlug: f.slug, actorId: f.actorId, memberAddress: f.pair.address }),
      f.pair.privateKeyHex,
    );
    const result = await createOrganization({
      ...f.input,
      founderKey: { address: f.pair.address, signature: wrong },
    });
    expect(result).toMatchObject({ created: false, refusal: "bad_signature" });
    expect(await orgRow(f.slug)).toBeUndefined();
  });

  it("refuses a taken address and seats no second founder", async () => {
    const first = founding();
    expect((await createOrganization(first.input)).created).toBe(true);

    const second = founding({ slug: first.slug });
    const result = await createOrganization(second.input);
    expect(result).toMatchObject({ created: false, verified: true, refusal: "slug_taken" });

    const org = await orgRow(first.slug);
    const seated = await db.query.members.findMany({
      where: eq(members.organizationId, org!.id),
    });
    expect(seated).toHaveLength(1);
  });

  it("refuses a reserved or malformed address before checking any signature", async () => {
    const f = founding();
    expect(await createOrganization({ ...f.input, slug: "new" })).toMatchObject({
      created: false,
      refusal: "invalid",
    });
  });
});

describe.runIf(RUN)("one identity, several rosters", () => {
  it("lets one identity found more than one organization", async () => {
    // Impossible before this change: members.oc_actor_id was globally unique,
    // so the second founding seat would have violated it.
    const actorId = newActor();
    expect((await createOrganization(founding({ actorId }).input)).created).toBe(true);
    expect((await createOrganization(founding({ actorId }).input)).created).toBe(true);

    const seats = await db.query.members.findMany({ where: eq(members.ocActorId, actorId) });
    expect(seats).toHaveLength(2);
  });

  it("still never gives one identity two seats in the same organization", async () => {
    const f = founding();
    expect((await createOrganization(f.input)).created).toBe(true);

    const other = generateKeyPair();
    const again = await registerMember({
      orgSlug: f.slug,
      actorId: f.actorId,
      displayName: "Second seat",
      key: {
        address: other.address,
        signature: signMessage(
          registrationMessage({
            orgSlug: f.slug,
            actorId: f.actorId,
            memberAddress: other.address,
          }),
          other.privateKeyHex,
        ),
      },
    });
    expect(again).toMatchObject({ registered: false, verified: true });
    expect(again.reason).toContain("already holds a seat in this organization");
  });

  it("does not let a seat elsewhere block claiming a founding seat", async () => {
    const actorId = newActor();
    expect((await createOrganization(founding({ actorId }).input)).created).toBe(true);

    // A second, seeded organization with an empty human roster.
    const slug = newSlug();
    await db.insert(organizations).values({ slug, name: "Seeded Org" });
    const pair = generateKeyPair();
    const claimed = await registerMember({
      orgSlug: slug,
      actorId,
      displayName: "Founder elsewhere",
      key: {
        address: pair.address,
        signature: signMessage(
          registrationMessage({ orgSlug: slug, actorId, memberAddress: pair.address }),
          pair.privateKeyHex,
        ),
      },
    });
    expect(claimed).toMatchObject({ registered: true, genesis: true });
  });
});

describe.runIf(RUN)("attribution to a Loki project", () => {
  it("records the project when Loki vouched for this identity", async () => {
    const project = `proj-${randomUUID().slice(0, 8)}`;
    const f = founding({ project });
    const result = await createOrganization(f.input);
    expect(result).toMatchObject({ created: true, claimedProject: project });

    const listed = (await listPublicOrganizations()).find((o) => o.slug === f.slug);
    expect(listed?.claimedProject).toBe(project);
  });

  it("refuses a grant issued to a different identity, and writes nothing", async () => {
    const project = `proj-${randomUUID().slice(0, 8)}`;
    const f = founding({ project, grant: grantFor(project, newActor()) });
    const result = await createOrganization(f.input);
    expect(result).toMatchObject({ created: false, refusal: "bad_grant" });
    expect(await orgRow(f.slug)).toBeUndefined();
  });

  it("refuses an expired grant", async () => {
    const project = `proj-${randomUUID().slice(0, 8)}`;
    const actorId = newActor();
    const f = founding({ actorId, project, grant: grantFor(project, actorId, -10) });
    expect(await createOrganization(f.input)).toMatchObject({
      created: false,
      refusal: "bad_grant",
    });
  });

  it("lets only one organization govern a project", async () => {
    const project = `proj-${randomUUID().slice(0, 8)}`;
    const actorId = newActor();
    expect((await createOrganization(founding({ actorId, project }).input)).created).toBe(true);

    const second = founding({ actorId, project });
    const result = await createOrganization(second.input);
    expect(result).toMatchObject({ created: false, refusal: "project_taken" });
    expect(await orgRow(second.slug)).toBeUndefined();
  });

  it("does not attribute an organization that merely shares a project's name", async () => {
    // The squatting case: anyone may found `<project>`, but without Loki's grant
    // it governs nothing.
    const slug = `proj-${randomUUID().slice(0, 8)}`;
    const result = await createOrganization(founding({ slug }).input);
    expect(result).toMatchObject({ created: true, claimedProject: null });
  });
});

describe.runIf(RUN)("the founding limit", () => {
  it(`stops one identity at ${MAX_FOUNDED_PER_ACTOR} organizations`, async () => {
    const actorId = newActor();
    for (let i = 0; i < MAX_FOUNDED_PER_ACTOR; i++) {
      expect((await createOrganization(founding({ actorId }).input)).created).toBe(true);
    }
    const over = founding({ actorId });
    expect(await createOrganization(over.input)).toMatchObject({
      created: false,
      refusal: "founding_limit",
    });
    expect(await orgRow(over.slug)).toBeUndefined();

    const founded = await db
      .select({ id: auditEvents.id })
      .from(auditEvents)
      .innerJoin(members, eq(auditEvents.actorMemberId, members.id))
      .where(
        and(eq(auditEvents.eventType, AuditEventType.ORG_CREATED), eq(members.ocActorId, actorId)),
      );
    expect(founded).toHaveLength(MAX_FOUNDED_PER_ACTOR);
  });
});
