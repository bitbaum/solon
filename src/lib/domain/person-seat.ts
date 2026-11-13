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
 *  - `recordPersonTag` stores the tag on a seat that was just created.
 *  - `planPersonTags` / `applyPersonTags` turn fresh tags into stored ones
 *    without ever writing two seats one tag; the backfill uses them too.
 *
 * A STORED TAG IS A CACHE. OrangeCat lets a person hand an identity over to
 * someone else, and from then on the identity's tag is the new person's. A
 * tag stored before that describes a person who no longer holds the seat:
 * compared as truth it would refuse the former holder (and tell the operator
 * the two were once one person) and let the new holder take a second seat.
 * So `seatHeldByPerson` asks OrangeCat, in one request, for the candidate AND
 * every seat it is compared with, decides on those answers only, and rewrites
 * any stored tag that changed. The unique index on (organization, person_tag)
 * for human seats that are not retired is the backstop under that.
 */
import { and, asc, eq, inArray, ne } from "drizzle-orm";
import { MemberStatus, MemberType } from "@/lib/db/enums";
import { db } from "@/lib/db/client";
import { members } from "@/lib/db/schema";
import {
  isOrangeCatActorId,
  personTagFor,
  personTagsFor,
  type PersonTagDeps,
} from "@/lib/orangecat-person";

export interface SeatRef {
  memberId: string;
  displayName: string;
}

/**
 * Two or more seats in one organization that OrangeCat now says are one
 * person's. Solon does not choose between them: the first keeps the tag, the
 * others are left untagged, and the organization decides.
 */
export interface SeatClash {
  seats: SeatRef[];
}

export type PersonSeatCheck =
  /** `tag` is what to store on the new seat; null when the account cannot be told apart. */
  | { ok: true; tag: string | null; clashes?: SeatClash[] }
  /** The person already holds a seat here, under another of their accounts. */
  | {
      ok: false;
      reason: "already_seated";
      memberId: string;
      displayName: string;
      clashes?: SeatClash[];
    }
  /** OrangeCat could not be asked. Not a "no": the caller must not seat on it either. */
  | { ok: false; reason: "unavailable"; detail: string };

/** A seat whose tag was just asked for: `fresh` is OrangeCat's answer now. */
export interface AskedSeat {
  id: string;
  displayName: string;
  personTag: string | null;
  fresh: string | null;
}

/** A seat whose stored tag stands (it was not asked about this time). */
export interface HeldSeat {
  id: string;
  displayName: string;
  personTag: string | null;
}

export interface PersonTagPlan {
  /** Stored tags to change: a new tag, or null for one OrangeCat now leaves out. */
  writes: { id: string; personTag: string | null }[];
  clashes: SeatClash[];
  /** Fresh tag -> the seat that keeps it. */
  holders: Map<string, SeatRef>;
}

/**
 * What every seat's stored tag should be, given fresh answers for `asked` and
 * the stored tags of `held`, all of one organization and in seniority order.
 * Pure: it is the in-memory map of tag -> seat that both the admission check
 * and the backfill decide with, so a dry run finds what a real run would.
 *
 * Where several seats share one tag, the seat that already stores it keeps it
 * (a held seat first), else the first in order; the others get no tag and are
 * reported, never written into a clash the index would refuse.
 */
export function planPersonTags(asked: AskedSeat[], held: HeldSeat[] = []): PersonTagPlan {
  type Entry = { seat: HeldSeat; tag: string; isHeld: boolean };
  const groups = new Map<string, Entry[]>();
  const add = (entry: Entry) => {
    const list = groups.get(entry.tag) ?? [];
    list.push(entry);
    groups.set(entry.tag, list);
  };
  for (const seat of held) if (seat.personTag) add({ seat, tag: seat.personTag, isHeld: true });
  for (const seat of asked) if (seat.fresh) add({ seat, tag: seat.fresh, isHeld: false });

  const target = new Map<string, string | null>(asked.map((s) => [s.id, s.fresh]));
  const clashes: SeatClash[] = [];
  const holders = new Map<string, SeatRef>();
  for (const [tag, entries] of groups) {
    const keeper =
      entries.find((e) => e.isHeld) ?? entries.find((e) => e.seat.personTag === tag) ?? entries[0]!;
    holders.set(tag, { memberId: keeper.seat.id, displayName: keeper.seat.displayName });
    if (entries.length < 2) continue;
    for (const e of entries) if (e !== keeper && !e.isHeld) target.set(e.seat.id, null);
    clashes.push({
      seats: [keeper, ...entries.filter((e) => e !== keeper)].map((e) => ({
        memberId: e.seat.id,
        displayName: e.seat.displayName,
      })),
    });
  }

  const writes = asked
    .filter((s) => (target.get(s.id) ?? null) !== s.personTag)
    .map((s) => ({ id: s.id, personTag: target.get(s.id) ?? null }));
  return { writes, clashes, holders };
}

/**
 * Store a plan's writes. Every changed seat is cleared first and given its new
 * tag after, in one transaction, so two seats trading tags never meet in the
 * index half-way.
 */
export async function applyPersonTags(writes: PersonTagPlan["writes"]): Promise<void> {
  if (writes.length === 0) return;
  await db.transaction(async (tx) => {
    await tx
      .update(members)
      .set({ personTag: null })
      .where(
        inArray(
          members.id,
          writes.map((w) => w.id),
        ),
      );
    for (const w of writes) {
      if (w.personTag) {
        await tx.update(members).set({ personTag: w.personTag }).where(eq(members.id, w.id));
      }
    }
  });
}

/** Would seating this account give its person a second seat here? */
export async function seatHeldByPerson(
  organizationId: string,
  actorId: string | null | undefined,
  deps: PersonTagDeps = {},
): Promise<PersonSeatCheck> {
  // An account OrangeCat knows nothing about cannot be told apart from anyone.
  if (!isOrangeCatActorId(actorId)) return { ok: true, tag: null };

  const roster = await db.query.members.findMany({
    where: and(
      eq(members.organizationId, organizationId),
      eq(members.memberType, MemberType.HUMAN),
      ne(members.status, MemberStatus.RETIRED),
    ),
    columns: { id: true, displayName: true, ocActorId: true, personTag: true },
    orderBy: [asc(members.joinedAt), asc(members.id)],
  });
  const askable = roster.filter((m) => isOrangeCatActorId(m.ocActorId));
  const held = roster.filter((m) => !isOrangeCatActorId(m.ocActorId));

  // One request (or one per hundred seats) for the candidate and the roster.
  const answer = await personTagsFor(
    [actorId, ...askable.map((m) => m.ocActorId!)],
    organizationId,
    deps,
  );
  if (!answer.ok) return { ok: false, reason: "unavailable", detail: answer.reason };

  const plan = planPersonTags(
    askable.map((m) => ({ ...m, fresh: answer.tags[m.ocActorId!] ?? null })),
    held,
  );
  try {
    await applyPersonTags(plan.writes);
  } catch (error) {
    // The decision below rests on the fresh answers, not on the cache; a seat
    // written meanwhile (the index refused a tag) is no reason to fail it.
    console.error("[person-seat] could not refresh stored person tags", { organizationId, error });
  }
  const clashes = plan.clashes.length > 0 ? { clashes: plan.clashes } : {};

  const tag = answer.tags[actorId] ?? null;
  const holder = tag ? plan.holders.get(tag) : undefined;
  if (holder) {
    return { ok: false, reason: "already_seated", ...holder, ...clashes };
  }
  return { ok: true, tag, ...clashes };
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

export interface BackfillReport {
  /** Seats given a tag they did not have. */
  stored: number;
  /** Seats whose stored tag OrangeCat now answers differently (a hand-over). */
  rewritten: number;
  /** Seats whose stored tag OrangeCat now leaves out, cleared. */
  cleared: number;
  /** Seats OrangeCat cannot tell apart. */
  none: number;
  /** Seats that could not be asked about. */
  failed: number;
  /** Seats asked about. */
  asked: number;
  clashes: { organizationId: string; clash: SeatClash }[];
  failures: { organizationId: string; reason: string }[];
}

/**
 * Give human seats their person tag, one organization at a time, asking
 * OrangeCat once per organization per hundred seats. By default only seats
 * without a tag are asked about, and compared with the tags already stored;
 * `refresh` asks again for every seat and rewrites the tags that changed.
 * With `dryRun` it writes nothing and reports what it would have done, clashes
 * included: the tags it would store are compared with each other in memory,
 * so two untagged seats of one person are found without either being written.
 */
export async function backfillPersonTags(
  options: { refresh?: boolean; dryRun?: boolean; organizationId?: string } = {},
  deps: PersonTagDeps = {},
): Promise<BackfillReport> {
  const report: BackfillReport = {
    stored: 0,
    rewritten: 0,
    cleared: 0,
    none: 0,
    failed: 0,
    asked: 0,
    clashes: [],
    failures: [],
  };
  const rows = await db.query.members.findMany({
    where: and(
      eq(members.memberType, MemberType.HUMAN),
      ne(members.status, MemberStatus.RETIRED),
      ...(options.organizationId ? [eq(members.organizationId, options.organizationId)] : []),
    ),
    columns: {
      id: true,
      organizationId: true,
      displayName: true,
      ocActorId: true,
      personTag: true,
    },
    orderBy: [asc(members.organizationId), asc(members.joinedAt), asc(members.id)],
  });
  const byOrganization = new Map<string, typeof rows>();
  for (const row of rows) {
    const list = byOrganization.get(row.organizationId) ?? [];
    list.push(row);
    byOrganization.set(row.organizationId, list);
  }

  for (const [organizationId, roster] of byOrganization) {
    const isAsked = (m: (typeof rows)[number]) =>
      isOrangeCatActorId(m.ocActorId) && (options.refresh || m.personTag === null);
    const asked = roster.filter(isAsked);
    if (asked.length === 0) continue;
    const held = roster.filter((m) => !isAsked(m));
    report.asked += asked.length;

    const answer = await personTagsFor(
      asked.map((m) => m.ocActorId!),
      organizationId,
      deps,
    );
    if (!answer.ok) {
      report.failed += asked.length;
      report.failures.push({ organizationId, reason: answer.reason });
      continue;
    }
    const plan = planPersonTags(
      asked.map((m) => ({ ...m, fresh: answer.tags[m.ocActorId!] ?? null })),
      held,
    );
    if (!options.dryRun) {
      try {
        await applyPersonTags(plan.writes);
      } catch (error) {
        report.failed += asked.length;
        report.failures.push({
          organizationId,
          reason: error instanceof Error ? error.message : "could not store the tags",
        });
        continue;
      }
    }
    const was = new Map(asked.map((m) => [m.id, m.personTag]));
    for (const w of plan.writes) {
      if (w.personTag === null) report.cleared++;
      else if (was.get(w.id) === null) report.stored++;
      else report.rewritten++;
    }
    report.none += asked.filter((m) => !answer.tags[m.ocActorId!]).length;
    for (const clash of plan.clashes) report.clashes.push({ organizationId, clash });
  }
  return report;
}
