/**
 * The contribution-allocation spine against a real database: declare →
 * supersede → aggregate, plus the gates that make it a right rather than a
 * setting.
 *
 * Runs only with INTEGRATION=1 and a DATABASE_URL whose schema is migrated
 * (CI: postgres service container + `prisma migrate deploy`). Plain `npm test`
 * skips it.
 */
import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { AllocationStatus, AuditEventType, PolicyStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { allocationMessage, generateKeyPair, signMessage } from "@/lib/bitcoin/message";
import { CONTRIBUTION_POLICY_KEY } from "@/lib/config/contribution";
import {
  allocationHistory,
  allocationReport,
  canonicalSplit,
  declareAllocation,
  splitHash,
  type Splits,
} from "../allocation";

const RUN = process.env.INTEGRATION === "1";

/** Sign a split exactly the way the server will rebuild it. */
function signedSplit(
  orgSlug: string,
  key: { address: string; privateKeyHex: string },
  splits: Splits,
  policyVersion: number | null,
) {
  const message = allocationMessage({
    orgSlug,
    memberAddress: key.address,
    policyVersion,
    split: canonicalSplit(splits),
    hash: splitHash(splits),
  });
  return { address: key.address, splits, signature: signMessage(message, key.privateKeyHex) };
}

async function seedOrg(members: number) {
  const slug = `alloc-${randomUUID().slice(0, 8)}`;
  const org = await prisma.organization.create({
    data: { slug, name: "Allocation Test Town" },
  });
  const keys = Array.from({ length: members }, () => generateKeyPair());
  for (const [i, key] of keys.entries()) {
    await prisma.member.create({
      data: {
        organizationId: org.id,
        displayName: `Member ${i + 1}`,
        memberType: "HUMAN",
        keyCustody: "SELF",
        bitcoinAddress: key.address,
        publicKeyHex: key.publicKeyHex,
      },
    });
  }
  return { org, slug, keys };
}

describe.runIf(RUN)("contribution allocation (database integration)", () => {
  it("carries a split from signature to the organization's effective allocation", async () => {
    const { org, slug, keys } = await seedOrg(2);
    const [alice, bob] = keys;

    // --- Nothing declared: the fallback is what applies, and it says so ---
    const before = await allocationReport(org.id);
    expect(before.version).toBeNull();
    expect(before.aggregate.counts).toMatchObject({ members: 2, declared: 0, undeclared: 2 });
    expect(before.aggregate.declaredWeightPercent).toBe(0);
    expect(before.aggregate.tiers.every((t) => t.declaredPercent === null)).toBe(true);

    // --- Alice declares everything local ---
    const declared = await declareAllocation({
      orgSlug: slug,
      ...signedSplit(slug, alice, { local: 100, state: 0, federal: 0 }, null),
    });
    expect(declared).toMatchObject({ stored: true, verified: true, version: 1 });

    const afterAlice = await allocationReport(org.id);
    expect(afterAlice.aggregate.counts).toMatchObject({ declared: 1, undeclared: 1 });
    // Alice at 100 local, Bob silent at the fallback's 34 → 67 between them.
    expect(afterAlice.aggregate.tiers.find((t) => t.key === "local")!.percent).toBe(67);
    expect(afterAlice.aggregate.declaredWeightPercent).toBe(50);

    // Declaring is an auditable act like any other.
    const event = await prisma.auditEvent.findFirst({
      where: { organizationId: org.id, eventType: AuditEventType.ALLOCATION_DECLARED },
    });
    expect(event?.subjectType).toBe("contribution_allocation");

    // --- Bob declares everything federal; the aggregate moves ---
    await declareAllocation({
      orgSlug: slug,
      ...signedSplit(slug, bob, { local: 0, state: 0, federal: 100 }, null),
    });
    const afterBoth = await allocationReport(org.id);
    expect(afterBoth.aggregate.declaredWeightPercent).toBe(100);
    expect(afterBoth.aggregate.tiers.find((t) => t.key === "local")!.percent).toBe(50);
    expect(afterBoth.aggregate.tiers.find((t) => t.key === "federal")!.percent).toBe(50);
    expect(afterBoth.aggregate.tiers.reduce((s, t) => s + t.displayPercent, 0)).toBe(100);
  });

  /**
   * Changing your mind versions, it does not overwrite. The point of keeping
   * the superseded row is that "what were they directing last spring" stays
   * answerable — with the signature that answered it.
   */
  it("supersedes rather than overwrites, and keeps every version signed", async () => {
    const { org, slug, keys } = await seedOrg(1);
    const [alice] = keys;

    await declareAllocation({
      orgSlug: slug,
      ...signedSplit(slug, alice, { local: 80, state: 10, federal: 10 }, null),
    });
    const second = await declareAllocation({
      orgSlug: slug,
      ...signedSplit(slug, alice, { local: 10, state: 10, federal: 80 }, null),
    });
    expect(second).toMatchObject({ stored: true, version: 2 });

    const history = await allocationHistory(org.id, alice.address);
    expect(history?.versions.map((v) => v.version)).toEqual([2, 1]);
    expect(history?.versions.map((v) => v.status)).toEqual([
      AllocationStatus.ACTIVE,
      AllocationStatus.SUPERSEDED,
    ]);
    // The replaced version keeps the exact text and signature that made it.
    expect(history?.versions[1].signature).toBeTruthy();
    expect(history?.versions[1].signedMessage).toContain("local=80");

    // Exactly one live split per member, always.
    const active = await prisma.contributionAllocation.count({
      where: { memberId: history!.member.id, status: AllocationStatus.ACTIVE },
    });
    expect(active).toBe(1);
  });

  /**
   * The gate that makes this a right: nothing but the member's own key writes
   * their split. There is no operator route to this table and no vote that
   * reaches it, so a forged signature is the only attack there is — and it
   * fails.
   */
  it("refuses a split that another key signed, and one that no key signed", async () => {
    const { slug, keys } = await seedOrg(2);
    const [alice, mallory] = keys;
    const splits = { local: 90, state: 5, federal: 5 };

    // Mallory signs Alice's address into the message with Mallory's key.
    const message = allocationMessage({
      orgSlug: slug,
      memberAddress: alice.address,
      policyVersion: null,
      split: canonicalSplit(splits),
      hash: splitHash(splits),
    });
    const forged = await declareAllocation({
      orgSlug: slug,
      address: alice.address,
      splits,
      signature: signMessage(message, mallory.privateKeyHex),
    });
    expect(forged).toMatchObject({ stored: false, verified: false, declined: "bad_signature" });

    // A signature over a different split does not carry to this one.
    const honest = signedSplit(slug, alice, { local: 50, state: 25, federal: 25 }, null);
    const lifted = await declareAllocation({
      orgSlug: slug,
      address: alice.address,
      splits: { local: 51, state: 24, federal: 25 },
      signature: honest.signature,
    });
    expect(lifted).toMatchObject({ stored: false, verified: false });

    // A stranger's key is not a member, however well it signs.
    const stranger = generateKeyPair();
    const outsider = await declareAllocation({
      orgSlug: slug,
      ...signedSplit(slug, stranger, splits, null),
    });
    expect(outsider).toMatchObject({ stored: false, verified: true, declined: "not_a_member" });
    expect(outsider.reason).toContain("not an active member");
  });

  /**
   * The bounds are checked before the cryptography, so a refusal has to say
   * which half failed. Without that, a split that simply does not add up comes
   * back looking like an authentication failure and sends the member to look
   * at their wallet for a problem that is in their arithmetic.
   */
  it("distinguishes a bad split from a bad signature", async () => {
    const { slug, keys } = await seedOrg(1);
    const [alice] = keys;
    const honest = signedSplit(slug, alice, { local: 50, state: 25, federal: 25 }, null);

    const doesNotAddUp = await declareAllocation({
      orgSlug: slug,
      address: alice.address,
      splits: { local: 50, state: 20, federal: 20 },
      signature: honest.signature,
    });
    expect(doesNotAddUp.declined).toBe("invalid_split");
    expect(doesNotAddUp.violations).toEqual([
      "the split adds up to 90%, and a whole contribution is 100%",
    ]);

    const noSuchOrg = await declareAllocation({ ...honest, orgSlug: "nowhere" });
    expect(noSuchOrg.declined).toBe("not_found");
  });

  it("refuses a split that breaks the enacted bounds, listing every reason at once", async () => {
    const { org, slug, keys } = await seedOrg(1);
    const [alice] = keys;

    // The members enact real bounds: a federal floor and a local ceiling.
    await prisma.policy.create({
      data: {
        organizationId: org.id,
        key: CONTRIBUTION_POLICY_KEY,
        version: 1,
        status: PolicyStatus.ACTIVE,
        content: {
          tiers: [
            { key: "local", label: "Local", minPercent: 0, maxPercent: 50 },
            { key: "state", label: "State", minPercent: 0, maxPercent: 100 },
            { key: "federal", label: "Federal", minPercent: 20, maxPercent: 100 },
          ],
          fallback: { local: 40, state: 40, federal: 20 },
        },
      },
    });

    const inForce = await allocationReport(org.id);
    expect(inForce.version).toBe(1);

    const rejected = await declareAllocation({
      orgSlug: slug,
      ...signedSplit(slug, alice, { local: 90, state: 10, federal: 0 }, 1),
    });
    expect(rejected.stored).toBe(false);
    expect(rejected.violations).toHaveLength(2); // over local ceiling, under federal floor

    const accepted = await declareAllocation({
      orgSlug: slug,
      ...signedSplit(slug, alice, { local: 50, state: 25, federal: 25 }, 1),
    });
    expect(accepted).toMatchObject({ stored: true, policyVersion: 1 });
  });

  /**
   * A declaration is consent to a split *under a stated set of bounds*. Without
   * the policy version inside the signed text, a split signed when a tier could
   * take everything could be replayed after a vote capped it, as if the member
   * had agreed to rules they never saw.
   */
  it("will not accept a signature made under a different policy version", async () => {
    const { org, slug, keys } = await seedOrg(1);
    const [alice] = keys;
    await prisma.policy.create({
      data: {
        organizationId: org.id,
        key: CONTRIBUTION_POLICY_KEY,
        version: 1,
        status: PolicyStatus.ACTIVE,
        content: {
          tiers: [
            { key: "local", label: "Local", minPercent: 0, maxPercent: 100 },
            { key: "state", label: "State", minPercent: 0, maxPercent: 100 },
            { key: "federal", label: "Federal", minPercent: 0, maxPercent: 100 },
          ],
          fallback: { local: 34, state: 33, federal: 33 },
        },
      },
    });

    // Signed as though the default bounds were still in force.
    const stale = await declareAllocation({
      orgSlug: slug,
      ...signedSplit(slug, alice, { local: 60, state: 20, federal: 20 }, null),
    });
    expect(stale).toMatchObject({ stored: false, verified: false });

    // The same split, signed under the version actually in force.
    const fresh = await declareAllocation({
      orgSlug: slug,
      ...signedSplit(slug, alice, { local: 60, state: 20, federal: 20 }, 1),
    });
    expect(fresh.stored).toBe(true);
  });

  /**
   * When a vote narrows the bounds, a split signed under the old ones can stop
   * fitting. It is not clamped into range — a clamped split is a statement the
   * member never made, still carrying their signature. It stops counting, the
   * record stands, and they fall to the fallback until they sign again.
   */
  it("stops counting a split the new bounds no longer admit, without touching the record", async () => {
    const { org, slug, keys } = await seedOrg(1);
    const [alice] = keys;

    await declareAllocation({
      orgSlug: slug,
      ...signedSplit(slug, alice, { local: 100, state: 0, federal: 0 }, null),
    });
    expect((await allocationReport(org.id)).aggregate.counts.declared).toBe(1);

    // The members later vote a federal floor Alice's split cannot meet.
    await prisma.policy.create({
      data: {
        organizationId: org.id,
        key: CONTRIBUTION_POLICY_KEY,
        version: 1,
        status: PolicyStatus.ACTIVE,
        content: {
          tiers: [
            { key: "local", label: "Local", minPercent: 0, maxPercent: 100 },
            { key: "state", label: "State", minPercent: 0, maxPercent: 100 },
            { key: "federal", label: "Federal", minPercent: 20, maxPercent: 100 },
          ],
          fallback: { local: 40, state: 40, federal: 20 },
        },
      },
    });

    const after = await allocationReport(org.id);
    expect(after.aggregate.counts).toMatchObject({ declared: 0, outOfBounds: 1 });
    expect(after.declarations[0].standing).toBe("out_of_bounds");
    expect(after.declarations[0].violations.length).toBeGreaterThan(0);
    // Counted at the fallback — not at 100 local, and not clamped to 80/0/20.
    expect(after.aggregate.tiers.find((t) => t.key === "local")!.percent).toBe(40);

    // The row itself is untouched: what she signed is still what is stored.
    const history = await allocationHistory(org.id, alice.address);
    expect(history?.versions[0].splits).toMatchObject({ local: 100, state: 0, federal: 0 });
    expect(history?.versions[0].status).toBe(AllocationStatus.ACTIVE);
  });

  it("reports watch-only addresses per tier without ever carrying an amount", async () => {
    const { org, slug } = await seedOrg(1);
    await prisma.treasurySource.create({
      data: {
        organizationId: org.id,
        label: "Town wallet",
        address: `bc1q${randomUUID().replace(/-/g, "").slice(0, 32)}`,
        tierKey: "local",
      },
    });

    const report = await allocationReport(org.id);
    expect(report.tierSources.local).toHaveLength(1);
    expect(report.tierSources.local[0].label).toBe("Town wallet");
    expect(Object.keys(report.tierSources.local[0])).toEqual(["label", "address"]);
    expect(report.tierSources.federal).toHaveLength(0);
    expect(slug).toBeTruthy();
  });
});
