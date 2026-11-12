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
import { recordPersonTag, seatHeldByPerson } from "@/lib/domain/person-seat";

const RUN = process.env.INTEGRATION === "1";
const tagOf = (letter: string) => letter.repeat(64);

async function freshOrg() {
  const [org] = await db
    .insert(organizations)
    .values({ slug: `ps-${randomUUID().slice(0, 8)}`, name: "Person Seat Test Org" })
    .returning();
  return org;
}

async function seat(organizationId: string, values: Partial<typeof members.$inferInsert> = {}) {
  const [row] = await db
    .insert(members)
    .values({
      organizationId,
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
function orangecat(tags: Record<string, string>, opts: { down?: boolean } = {}) {
  return {
    clientId: "solon",
    clientSecret: "s",
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
});
