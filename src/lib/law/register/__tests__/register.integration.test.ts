/**
 * The law register through the real importer into a real database: acts, their
 * numbers and titles, a rerun that changes nothing, a changed title that
 * supersedes, an act the register stops listing (reported, never ended) and a
 * dry run that leaves no trace.
 *
 * Runs only with INTEGRATION=1 against a migrated database.
 */
import { randomInt } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { LEXFIND } from "@/lib/config/law";
import { db } from "@/lib/db/client";
import { legalActIdentifiers, legalActNames, legalActs } from "@/lib/db/law-schema";
import type { SnapshotStore } from "@/lib/places/importer/snapshots";
import { searchActs } from "../coverage";
import { importRegister } from "../import";
import type { RegisterSnapshot } from "../lexfind";

const RUN = process.env.INTEGRATION === "1";

const snapshots: SnapshotStore = {
  async put(sha) {
    return `memory/${sha}`;
  },
  async get() {
    throw new Error("not needed here");
  },
};

/** Ids that cannot collide with a real register or another run of this spec. */
const base = 900_000_000 + randomInt(1, 50_000_000) * 10;
const [A, B, C] = [base + 1, base + 2, base + 3];
/** Numbers unique to this run, so earlier runs on the same database cannot answer. */
const N = `t${base}`;

const snapshotOf = (
  acts: RegisterSnapshot["authorities"][number]["acts"],
  extra = "",
): Uint8Array =>
  new TextEncoder().encode(
    JSON.stringify({
      fetchedAt: "2026-10-23T00:00:00.000Z",
      authorities: [
        { code: "ZH", acts },
        ...(extra
          ? [
              {
                code: extra,
                acts: [
                  {
                    id: base + 9,
                    title: "X",
                    systematicNumber: null,
                    inForce: true,
                    categoryId: 4,
                  },
                ],
              },
            ]
          : []),
      ],
    }),
  );

const act = (id: number, title: string, number: string | null, inForce = true) => ({
  id,
  title,
  systematicNumber: number,
  inForce,
  categoryId: 4,
});

const run = (bytes: Uint8Array, dryRun = false) =>
  importRegister(db, {
    register: LEXFIND,
    bytes,
    url: "test",
    retrievedAt: new Date(),
    snapshots,
    dryRun,
  });

async function actBy(lexfindId: number) {
  const [row] = await db
    .select({ id: legalActs.id, inForce: legalActs.inForce, authority: legalActs.authority })
    .from(legalActIdentifiers)
    .innerJoin(legalActs, eq(legalActs.id, legalActIdentifiers.actId))
    .where(
      and(
        eq(legalActIdentifiers.scheme, "lexfind_id"),
        eq(legalActIdentifiers.value, String(lexfindId)),
        isNull(legalActIdentifiers.supersededAt),
      ),
    );
  return row;
}

describe.skipIf(!RUN)("law register import", () => {
  it("dry run reports the diff and leaves nothing behind", async () => {
    const report = await run(snapshotOf([act(A, "Dry", `${N}.1`)]), true);
    expect(report.status).toBe("dry_run");
    expect(report.counts.actsInserted).toBe(1);
    expect(await actBy(A)).toBeUndefined();
  });

  it("inserts acts with their number and title, in the authority the register names", async () => {
    const report = await run(
      snapshotOf(
        [
          act(A, "Kantonsverfassung", `${N}.1`),
          act(B, "Gesetz B", `${N}.2`),
          act(C, `Gesetz C ${N}`, null, false),
        ],
        "ZZ",
      ),
    );
    expect(report.status).toBe("applied");
    expect(report.counts.actsInserted).toBe(3);
    expect(report.skipped.map((s) => s.reason)).toEqual([
      expect.stringContaining("authority ZZ is not in config"),
    ]);
    expect((await actBy(A))!.authority).toBe("zh");
    expect((await actBy(C))!.inForce).toBe(false);
    const hits = await searchActs(db, { authority: "zh", number: `${N}.1` });
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({
      title: "Kantonsverfassung",
      systematicNumber: `${N}.1`,
      inForce: true,
    });
    expect(await searchActs(db, { authority: "zh", title: `Gesetz C ${N}` })).toHaveLength(1);
  });

  it("changes nothing when run again on the same register", async () => {
    const report = await run(
      snapshotOf([
        act(A, "Kantonsverfassung", `${N}.1`),
        act(B, "Gesetz B", `${N}.2`),
        act(C, `Gesetz C ${N}`, null, false),
      ]),
    );
    expect(report.counts).toEqual({
      actsInserted: 0,
      actsUpdated: 0,
      namesInserted: 0,
      namesSuperseded: 0,
      identifiersInserted: 0,
      identifiersSuperseded: 0,
    });
  });

  it("supersedes a changed title and number, updates the in-force flag, and reports an act no longer listed", async () => {
    const report = await run(
      snapshotOf([
        act(A, "Verfassung des Kantons", `${N}.10`, false),
        act(B, "Gesetz B", `${N}.2`),
      ]),
    );
    expect(report.status).toBe("applied");
    expect(report.counts).toMatchObject({
      actsInserted: 0,
      actsUpdated: 1,
      namesInserted: 1,
      namesSuperseded: 1,
      identifiersInserted: 1,
      identifiersSuperseded: 1,
    });
    // C is reported, not ended: only a publisher can say an act ended.
    expect(report.missingFromSource).toBeGreaterThanOrEqual(1);
    expect(await actBy(C)).toBeDefined();

    const a = (await actBy(A))!;
    expect(a.inForce).toBe(false);
    const names = await db.select().from(legalActNames).where(eq(legalActNames.actId, a.id));
    expect(names.map((n) => [n.text, n.supersededAt === null])).toEqual(
      expect.arrayContaining([
        ["Kantonsverfassung", false],
        ["Verfassung des Kantons", true],
      ]),
    );
    expect(await searchActs(db, { authority: "zh", number: `${N}.1` })).toHaveLength(0);
    expect(await searchActs(db, { authority: "zh", number: `${N}.10` })).toHaveLength(1);
  });

  it("refuses bytes that are not a register, and records the failed run", async () => {
    const report = await run(new TextEncoder().encode('{"authorities":"nope"}'));
    expect(report.status).toBe("failed");
    expect(report.problems.length).toBeGreaterThan(0);
  });
});
