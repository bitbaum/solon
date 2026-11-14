/**
 * One person, one human seat per organization, against a real database.
 *
 * The rule is a unique index, so it is tested where it lives. Runs only with
 * INTEGRATION=1 against a migrated database (same harness as the vote spine).
 */
import { describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { MemberStatus, MemberType } from "@/lib/db/enums";
import { db } from "@/lib/db/client";
import { members, organizations } from "@/lib/db/schema";
import { backfillPersonTags, recordPersonTag, seatHeldByPerson } from "@/lib/domain/person-seat";

const RUN = process.env.INTEGRATION === "1";
const tagOf = (letter: string) => letter.repeat(64);

async function freshOrg() {
  const [org] = await db
    .insert(organizations)
    .values({ slug: `ps-${randomUUID().slice(0, 8)}`, name: "Person Seat Test Org" })
    .returning();
  return org;
}

/**
 * Each seat joins one second after the last. The first to join keeps a shared
 * tag (planPersonTags); two inserts in a row could carry the same joinedAt,
 * and the tie then fell to the random id, so "A first" failed one run in a few.
 */
let joined = Date.UTC(2026, 0, 1);
async function seat(organizationId: string, values: Partial<typeof members.$inferInsert> = {}) {
  joined += 1000;
  const [row] = await db
    .insert(members)
    .values({
      organizationId,
      joinedAt: new Date(joined),
      displayName: "Member",
      memberType: MemberType.HUMAN,
      ocActorId: randomUUID(),
      status: MemberStatus.ACTIVE,
      ...values,
    })
    .returning();
  return row;
}

/** OrangeCat, answering with whatever tag this test says an actor has. */
function orangecat(
  tags: Record<string, string>,
  opts: { down?: boolean; noClient?: boolean } = {},
) {
  return {
    clientId: opts.noClient ? "" : "solon",
    clientSecret: opts.noClient ? "" : "s",
    issuer: "https://oc.test",
    fetch: vi.fn(async (_url: string, init?: RequestInit) => {
      if (opts.down) throw new Error("unreachable");
      const { subjects } = JSON.parse(init!.body as string) as { subjects: string[] };
      const out = Object.fromEntries(subjects.filter((s) => tags[s]).map((s) => [s, tags[s]]));
      return new Response(JSON.stringify({ tags: out }), { status: 200 });
    }) as unknown as typeof fetch,
  };
}

describe.runIf(RUN)("one person, one human seat", () => {
  it("the database refuses a second human seat with the same person tag", async () => {
    const org = await freshOrg();
    await seat(org.id, { personTag: tagOf("a") });
    await expect(seat(org.id, { personTag: tagOf("a") })).rejects.toThrow();
    // A different person, and a seat that cannot be told apart, are fine.
    await seat(org.id, { personTag: tagOf("b") });
    await seat(org.id, { personTag: null });
    await seat(org.id, { personTag: null });
  });

  it("the same person may sit in another organization", async () => {
    const [one, two] = [await freshOrg(), await freshOrg()];
    await seat(one.id, { personTag: tagOf("a") });
    await seat(two.id, { personTag: tagOf("a") });
  });

  it("a retired seat does not block the person from being seated again", async () => {
    const org = await freshOrg();
    await seat(org.id, { personTag: tagOf("a"), status: MemberStatus.RETIRED });
    await seat(org.id, { personTag: tagOf("a") });
  });

  it("a suspended seat does: a suspension is not dodged under another identity", async () => {
    const org = await freshOrg();
    await seat(org.id, { personTag: tagOf("a"), status: MemberStatus.SUSPENDED });
    await expect(seat(org.id, { personTag: tagOf("a") })).rejects.toThrow();
  });

  it("an agent's seat is not a person's seat", async () => {
    const org = await freshOrg();
    await seat(org.id, { personTag: tagOf("a") });
    await seat(org.id, {
      personTag: tagOf("a"),
      memberType: MemberType.AGENT,
      ocActorId: null,
      bitcoinAddress: `1${randomUUID().replace(/-/g, "").slice(0, 30)}`,
      system: `test:${randomUUID()}`,
    });
  });

  it("seatHeldByPerson names the seat the person already holds under another account", async () => {
    const org = await freshOrg();
    const first = randomUUID();
    const second = randomUUID();
    const oc = orangecat({ [first]: tagOf("a"), [second]: tagOf("a") });
    const held = await seat(org.id, { ocActorId: first, displayName: "Fernando" });
    expect(await recordPersonTag(held.id, org.id, first, oc)).toBe("stored");

    expect(await seatHeldByPerson(org.id, second, oc)).toEqual({
      ok: false,
      reason: "already_seated",
      memberId: held.id,
      displayName: "Fernando",
    });
    // Someone else, and an account OrangeCat cannot tell apart, may be seated.
    const other = randomUUID();
    expect(await seatHeldByPerson(org.id, other, orangecat({ [other]: tagOf("b") }))).toEqual({
      ok: true,
      tag: tagOf("b"),
    });
    expect(await seatHeldByPerson(org.id, randomUUID(), oc)).toEqual({ ok: true, tag: null });
  });

  it("does not decide when OrangeCat cannot be asked", async () => {
    const org = await freshOrg();
    const check = await seatHeldByPerson(org.id, randomUUID(), orangecat({}, { down: true }));
    expect(check).toMatchObject({ ok: false, reason: "unavailable" });
  });

  it("recordPersonTag never fails a seat: it stores, finds none, or reports failure", async () => {
    const org = await freshOrg();
    const actor = randomUUID();
    const row = await seat(org.id, { ocActorId: actor });
    expect(await recordPersonTag(row.id, org.id, actor, orangecat({}))).toBe("none");
    expect(await recordPersonTag(row.id, org.id, actor, orangecat({}, { down: true }))).toBe(
      "failed",
    );
    expect(await recordPersonTag(row.id, org.id, actor, orangecat({ [actor]: tagOf("c") }))).toBe(
      "stored",
    );
    const stored = await db.query.members.findFirst({ where: eq(members.id, row.id) });
    expect(stored?.personTag).toBe(tagOf("c"));
  });

  it("does not decide when no OrangeCat client is configured", async () => {
    const org = await freshOrg();
    const check = await seatHeldByPerson(org.id, randomUUID(), orangecat({}, { noClient: true }));
    expect(check).toEqual({
      ok: false,
      reason: "unavailable",
      detail: "no OrangeCat client configured",
    });
  });

  it("asks once, for the candidate and every seat it is compared with", async () => {
    const org = await freshOrg();
    const seated = [await seat(org.id), await seat(org.id), await seat(org.id)];
    await seat(org.id, { status: MemberStatus.RETIRED });
    const candidate = randomUUID();
    const oc = orangecat({});
    await seatHeldByPerson(org.id, candidate, oc);
    const calls = (oc.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls).toHaveLength(1);
    const { subjects } = JSON.parse((calls[0]![1] as RequestInit).body as string);
    expect([...subjects].sort()).toEqual([candidate, ...seated.map((m) => m.ocActorId)].sort());
  });

  it("after a hand-over, the former holder is not refused by the seat they handed over", async () => {
    // Holder H's identity I sits here, tagged as H. H hands I to someone
    // else, so OrangeCat now answers I's own tag for it.
    const org = await freshOrg();
    const identity = randomUUID();
    const holder = randomUUID();
    const handedOver = await seat(org.id, { ocActorId: identity, personTag: tagOf("d") });

    const after = orangecat({ [identity]: tagOf("e"), [holder]: tagOf("d") });
    expect(await seatHeldByPerson(org.id, holder, after)).toEqual({ ok: true, tag: tagOf("d") });
    // And the stale tag is rewritten, so the index protects the right person.
    const row = await db.query.members.findFirst({ where: eq(members.id, handedOver.id) });
    expect(row?.personTag).toBe(tagOf("e"));
    // The former holder can now actually be seated with their tag.
    await seat(org.id, { ocActorId: holder, personTag: tagOf("d") });
  });

  it("after a hand-over, the new holder cannot take a second seat under another identity", async () => {
    const org = await freshOrg();
    const identity = randomUUID();
    const newIdentity = randomUUID();
    const handedOver = await seat(org.id, {
      ocActorId: identity,
      personTag: tagOf("d"),
      displayName: "Handed over",
    });
    // The new holder of I creates identity J; J's tag is I's.
    const after = orangecat({ [identity]: tagOf("e"), [newIdentity]: tagOf("e") });
    expect(await seatHeldByPerson(org.id, newIdentity, after)).toEqual({
      ok: false,
      reason: "already_seated",
      memberId: handedOver.id,
      displayName: "Handed over",
    });
  });

  it("clears a stored tag OrangeCat now leaves out", async () => {
    const org = await freshOrg();
    const row = await seat(org.id, { personTag: tagOf("a") });
    expect(await seatHeldByPerson(org.id, randomUUID(), orangecat({}))).toEqual({
      ok: true,
      tag: null,
    });
    const stored = await db.query.members.findFirst({ where: eq(members.id, row.id) });
    expect(stored?.personTag).toBeNull();
  });

  it("two seats trading tags are rewritten without tripping the index", async () => {
    const org = await freshOrg();
    const one = await seat(org.id, { personTag: tagOf("a") });
    const two = await seat(org.id, { personTag: tagOf("b") });
    const oc = orangecat({ [one.ocActorId!]: tagOf("b"), [two.ocActorId!]: tagOf("a") });
    expect(await seatHeldByPerson(org.id, randomUUID(), oc)).toEqual({ ok: true, tag: null });
    const rows = await db.query.members.findMany({ where: eq(members.organizationId, org.id) });
    expect(Object.fromEntries(rows.map((r) => [r.id, r.personTag]))).toEqual({
      [one.id]: tagOf("b"),
      [two.id]: tagOf("a"),
    });
  });

  it("reports two seated accounts that are now one person's, instead of crashing on the index", async () => {
    const org = await freshOrg();
    const first = await seat(org.id, { personTag: tagOf("a"), displayName: "First" });
    const second = await seat(org.id, { personTag: tagOf("b"), displayName: "Second" });
    const oc = orangecat({ [first.ocActorId!]: tagOf("c"), [second.ocActorId!]: tagOf("c") });
    const check = await seatHeldByPerson(org.id, randomUUID(), oc);
    expect(check).toEqual({
      ok: true,
      tag: null,
      clashes: [
        {
          seats: [
            { memberId: first.id, displayName: "First" },
            { memberId: second.id, displayName: "Second" },
          ],
        },
      ],
    });
    const rows = await db.query.members.findMany({ where: eq(members.organizationId, org.id) });
    expect(Object.fromEntries(rows.map((r) => [r.id, r.personTag]))).toEqual({
      [first.id]: tagOf("c"),
      [second.id]: null,
    });
  });
});

describe.runIf(RUN)("backfill-person-tags", () => {
  it("dry run finds two untagged seats of one person, and writes nothing", async () => {
    const org = await freshOrg();
    const a = await seat(org.id, { displayName: "A" });
    const b = await seat(org.id, { displayName: "B" });
    const oc = orangecat({ [a.ocActorId!]: tagOf("a"), [b.ocActorId!]: tagOf("a") });
    const report = await backfillPersonTags({ dryRun: true, organizationId: org.id }, oc);
    expect(report).toMatchObject({ stored: 1, failed: 0, asked: 2 });
    expect(report.clashes).toEqual([
      {
        organizationId: org.id,
        clash: {
          seats: [
            { memberId: a.id, displayName: "A" },
            { memberId: b.id, displayName: "B" },
          ],
        },
      },
    ]);
    const rows = await db.query.members.findMany({ where: eq(members.organizationId, org.id) });
    expect(rows.every((r) => r.personTag === null)).toBe(true);

    // The real run reports the same, and stores the first only.
    const real = await backfillPersonTags({ organizationId: org.id }, oc);
    expect(real).toMatchObject({ stored: 1, failed: 0 });
    expect(real.clashes).toHaveLength(1);
    const after = await db.query.members.findMany({ where: eq(members.organizationId, org.id) });
    expect(Object.fromEntries(after.map((r) => [r.id, r.personTag]))).toEqual({
      [a.id]: tagOf("a"),
      [b.id]: null,
    });
  });

  it("asks once per organization, not once per seat", async () => {
    const org = await freshOrg();
    const rows = [await seat(org.id), await seat(org.id), await seat(org.id)];
    const oc = orangecat(Object.fromEntries(rows.map((r, i) => [r.ocActorId!, tagOf("abc"[i]!)])));
    const report = await backfillPersonTags({ organizationId: org.id }, oc);
    expect(report).toMatchObject({ stored: 3, failed: 0, asked: 3 });
    expect((oc.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);
  });

  it("only refresh re-asks about tagged seats, and rewrites the ones that changed", async () => {
    const org = await freshOrg();
    const handedOver = await seat(org.id, { personTag: tagOf("d") });
    const gone = await seat(org.id, { personTag: tagOf("f") });
    const oc = orangecat({ [handedOver.ocActorId!]: tagOf("e") });

    expect(await backfillPersonTags({ organizationId: org.id }, oc)).toMatchObject({ asked: 0 });
    const report = await backfillPersonTags({ organizationId: org.id, refresh: true }, oc);
    expect(report).toMatchObject({ asked: 2, rewritten: 1, cleared: 1, none: 1, failed: 0 });
    const rows = await db.query.members.findMany({ where: eq(members.organizationId, org.id) });
    expect(Object.fromEntries(rows.map((r) => [r.id, r.personTag]))).toEqual({
      [handedOver.id]: tagOf("e"),
      [gone.id]: null,
    });
  });

  it("counts every seat as failed when OrangeCat cannot be asked, or no client is configured", async () => {
    const org = await freshOrg();
    await seat(org.id);
    await seat(org.id);
    for (const oc of [orangecat({}, { down: true }), orangecat({}, { noClient: true })]) {
      const report = await backfillPersonTags({ organizationId: org.id }, oc);
      expect(report).toMatchObject({ failed: 2, stored: 0, none: 0 });
      expect(report.failures).toHaveLength(1);
    }
  });
});
