/**
 * Amendments in the database: filing, revising, forking, supporting, reading,
 * and the chained log (design: docs/design/2026-11-amending-the-law.md).
 *
 * Every write is one transaction: the row and its event land together or not
 * at all. Signed acts are verified here, before anything is written; an
 * account act carries no signature and is recorded as Solon's record.
 */
import { and, asc, count, desc, eq, gt, gte, inArray, isNull } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { verifyMessage } from "@/lib/bitcoin/message";
import type { Database, Tx } from "@/lib/db/client";
import {
  lawAmendmentEvents,
  lawAmendmentRevisions,
  lawAmendmentSupports,
  lawAmendments,
} from "@/lib/db/amendments-schema";
import { legalActVersions, legalActs, legalProvisions } from "@/lib/db/law-schema";
import type { Actor } from "@/lib/domain/proof";
import {
  ChangesSchema,
  applyChanges,
  checkChanges,
  redline,
  standing,
  type AmendedProvision,
  type Change,
  type ChangeProblem,
  type Provision,
  LIMITS,
} from "./changes";
import { routesFor, type OfficialRoute } from "@/lib/config/law/routes";
import { GENESIS, amendmentMessage, eventHash, revisionHash, type RevisionContent } from "./hash";
import { countSupport, supporterRef, type SupportCount, type SupportKind } from "./support";

/** A refusal the caller can show as it is: what was wrong, never a stack. */
export class AmendmentError extends Error {
  constructor(
    readonly status: 400 | 401 | 403 | 404 | 409 | 429,
    message: string,
    readonly problems: ChangeProblem[] = [],
  ) {
    super(message);
  }
}

type Reader = Pick<Database, "select">;

const proofOf = (actor: Actor) => (actor.via === "key" ? "BIP137" : "ACCOUNT");

/** The provisions of one act version, in the act's order. */
export async function provisionsOf(db: Reader, versionId: string): Promise<Provision[]> {
  return db
    .select({
      path: legalProvisions.path,
      heading: legalProvisions.heading,
      text: legalProvisions.text,
    })
    .from(legalProvisions)
    .where(eq(legalProvisions.versionId, versionId))
    .orderBy(asc(legalProvisions.ord));
}

/** The act's version in force in a language, if Solon holds one. */
async function versionInForce(db: Reader, actId: string, lang: string) {
  const [row] = await db
    .select({ id: legalActVersions.id, lang: legalActVersions.lang })
    .from(legalActVersions)
    .where(
      and(
        eq(legalActVersions.actId, actId),
        eq(legalActVersions.lang, lang),
        isNull(legalActVersions.inForceTo),
      ),
    )
    .orderBy(desc(legalActVersions.inForceFrom))
    .limit(1);
  return row ?? null;
}

/** Refuses a signed act whose signature does not recover to its address. */
function verifySigned(actor: Actor, message: () => string): void {
  if (actor.via !== "key") return;
  const result = verifyMessage(message(), actor.address, actor.signature);
  if (!result.valid) {
    throw new AmendmentError(401, `the signature does not match: ${result.reason ?? "invalid"}`);
  }
}

/**
 * Append one event to the chain. A transaction-scoped advisory lock serializes
 * writers, so no two events can claim the same predecessor; the unique index
 * on prev_hash would refuse one anyway.
 */
async function appendEvent(
  tx: Tx,
  event: { type: string; amendmentId: string; payload: Record<string, unknown> },
): Promise<void> {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('law_amendment_events'))`);
  const [last] = await tx
    .select({ seq: lawAmendmentEvents.seq, hash: lawAmendmentEvents.hash })
    .from(lawAmendmentEvents)
    .orderBy(desc(lawAmendmentEvents.seq))
    .limit(1);
  const seq = (last?.seq ?? 0) + 1;
  const prevHash = last?.hash ?? GENESIS;
  const chained = {
    seq,
    prevHash,
    type: event.type,
    amendmentId: event.amendmentId,
    payload: event.payload,
  };
  await tx.insert(lawAmendmentEvents).values({ ...chained, hash: eventHash(chained) });
}

export interface FileInput {
  /** The amendment's id, chosen by the client so a signer can name it in what they sign. */
  id: string;
  actor: Actor;
  actId: string;
  lang: string;
  title: string;
  rationale: string;
  changes: unknown;
  /** The revision this one forks, when it is a fork. */
  forkOf?: string;
}

/** How many revisions one author may file in an hour: generous for a person, a wall for a script. */
export const FILINGS_PER_HOUR = 20;

/** Refuses an author who has filed too much in the last hour. */
async function ensureWithinRate(db: Reader, author: string): Promise<void> {
  const [row] = await db
    .select({ n: count() })
    .from(lawAmendmentRevisions)
    .where(
      and(
        eq(lawAmendmentRevisions.author, author),
        gte(lawAmendmentRevisions.recordedAt, new Date(Date.now() - 60 * 60 * 1000)),
      ),
    );
  if ((row?.n ?? 0) >= FILINGS_PER_HOUR) {
    throw new AmendmentError(429, `at most ${FILINGS_PER_HOUR} filings an hour; try again later`);
  }
}

/** Validates the words a person typed, before anything is read or written. */
function validateWords(title: string, rationale: string, changes: unknown): Change[] {
  const cleanTitle = title.trim();
  if (cleanTitle.length === 0 || cleanTitle.length > LIMITS.title) {
    throw new AmendmentError(400, `a title of 1 to ${LIMITS.title} characters`);
  }
  if (rationale.length > LIMITS.rationale) {
    throw new AmendmentError(400, `a rationale of at most ${LIMITS.rationale} characters`);
  }
  const parsed = ChangesSchema.safeParse(changes);
  if (!parsed.success)
    throw new AmendmentError(400, `the changes: ${parsed.error.issues[0]?.message}`);
  return parsed.data;
}

/** Checks the changes against the version in force and returns what the revision says. */
async function prepareRevision(
  db: Reader,
  input: { actId: string; lang: string; title: string; rationale: string; changes: Change[] },
): Promise<{ content: RevisionContent; contentHash: string }> {
  const [act] = await db
    .select({ id: legalActs.id, authority: legalActs.authority })
    .from(legalActs)
    .where(eq(legalActs.id, input.actId))
    .limit(1);
  if (!act) throw new AmendmentError(404, "no such act");
  const version = await versionInForce(db, act.id, input.lang);
  if (!version)
    throw new AmendmentError(404, `Solon holds no text of this act in force in ${input.lang}`);
  const problems = checkChanges(await provisionsOf(db, version.id), input.changes);
  if (problems.length > 0) {
    throw new AmendmentError(409, "the changes do not fit the text in force", problems);
  }
  const content: RevisionContent = {
    authority: act.authority,
    act: act.id,
    baseVersion: version.id,
    lang: input.lang,
    title: input.title.trim(),
    rationale: input.rationale,
    changes: input.changes,
  };
  return { content, contentHash: revisionHash(content) };
}

/** File a new amendment (revision 1), or fork an existing revision into a new one. */
export async function fileAmendment(db: Database, input: FileInput) {
  if (!/^[0-9a-f-]{36}$/.test(input.id)) throw new AmendmentError(400, "the id is a UUID");
  const changes = validateWords(input.title, input.rationale, input.changes);
  const { content, contentHash } = await prepareRevision(db, { ...input, changes });
  verifySigned(input.actor, () =>
    amendmentMessage({
      act: "file",
      amendmentId: input.id,
      revision: 1,
      contentHash,
      address: input.actor.via === "key" ? input.actor.address : "",
    }),
  );
  const author = supporterRef(input.actor);
  await ensureWithinRate(db, author);
  return db.transaction(async (tx) => {
    if (input.forkOf) {
      const [parent] = await tx
        .select({ id: lawAmendmentRevisions.id, amendmentId: lawAmendmentRevisions.amendmentId })
        .from(lawAmendmentRevisions)
        .where(eq(lawAmendmentRevisions.id, input.forkOf))
        .limit(1);
      if (!parent) throw new AmendmentError(404, "no such revision to fork");
    }
    const [existing] = await tx
      .select({ id: lawAmendments.id })
      .from(lawAmendments)
      .where(eq(lawAmendments.id, input.id))
      .limit(1);
    if (existing) throw new AmendmentError(409, "an amendment with this id exists");
    await tx.insert(lawAmendments).values({
      id: input.id,
      authority: content.authority,
      actId: content.act,
      author,
      forkedFromRevisionId: input.forkOf ?? null,
    });
    const [revision] = await tx
      .insert(lawAmendmentRevisions)
      .values({
        amendmentId: input.id,
        revision: 1,
        lang: content.lang,
        baseVersionId: content.baseVersion,
        title: content.title,
        rationale: content.rationale,
        changes: content.changes,
        contentHash,
        author,
        proof: proofOf(input.actor),
        signature: input.actor.via === "key" ? input.actor.signature : null,
      })
      .returning({ id: lawAmendmentRevisions.id });
    await appendEvent(tx, {
      type: input.forkOf ? "forked" : "filed",
      amendmentId: input.id,
      payload: {
        revision: 1,
        contentHash,
        author,
        proof: proofOf(input.actor),
        forkOf: input.forkOf ?? null,
      },
    });
    return { id: input.id, revisionId: revision!.id, revision: 1, contentHash };
  });
}

/** The author files the next revision: the same amendment, new words, a new hash. */
export async function reviseAmendment(
  db: Database,
  input: Omit<FileInput, "id" | "forkOf" | "actId"> & { amendmentId: string },
) {
  const changes = validateWords(input.title, input.rationale, input.changes);
  const [amendment] = await db
    .select()
    .from(lawAmendments)
    .where(eq(lawAmendments.id, input.amendmentId))
    .limit(1);
  if (!amendment) throw new AmendmentError(404, "no such amendment");
  if (amendment.author !== supporterRef(input.actor)) {
    throw new AmendmentError(403, "only its author revises an amendment; anyone may fork it");
  }
  await ensureWithinRate(db, amendment.author);
  const { content, contentHash } = await prepareRevision(db, {
    actId: amendment.actId,
    lang: input.lang,
    title: input.title,
    rationale: input.rationale,
    changes,
  });
  return db.transaction(async (tx) => {
    const [last] = await tx
      .select({ revision: lawAmendmentRevisions.revision })
      .from(lawAmendmentRevisions)
      .where(eq(lawAmendmentRevisions.amendmentId, amendment.id))
      .orderBy(desc(lawAmendmentRevisions.revision))
      .limit(1);
    const next = (last?.revision ?? 0) + 1;
    verifySigned(input.actor, () =>
      amendmentMessage({
        act: "file",
        amendmentId: amendment.id,
        revision: next,
        contentHash,
        address: input.actor.via === "key" ? input.actor.address : "",
      }),
    );
    const [revision] = await tx
      .insert(lawAmendmentRevisions)
      .values({
        amendmentId: amendment.id,
        revision: next,
        lang: content.lang,
        baseVersionId: content.baseVersion,
        title: content.title,
        rationale: content.rationale,
        changes: content.changes,
        contentHash,
        author: amendment.author,
        proof: proofOf(input.actor),
        signature: input.actor.via === "key" ? input.actor.signature : null,
      })
      .returning({ id: lawAmendmentRevisions.id });
    await appendEvent(tx, {
      type: "revised",
      amendmentId: amendment.id,
      payload: {
        revision: next,
        contentHash,
        author: amendment.author,
        proof: proofOf(input.actor),
      },
    });
    return { id: amendment.id, revisionId: revision!.id, revision: next, contentHash };
  });
}

/** Stand behind one revision, or stop standing behind it. Both are new rows. */
export async function recordSupport(
  db: Database,
  input: { actor: Actor; amendmentId: string; revision: number; kind: SupportKind },
) {
  const [revision] = await db
    .select({ id: lawAmendmentRevisions.id, contentHash: lawAmendmentRevisions.contentHash })
    .from(lawAmendmentRevisions)
    .where(
      and(
        eq(lawAmendmentRevisions.amendmentId, input.amendmentId),
        eq(lawAmendmentRevisions.revision, input.revision),
      ),
    )
    .limit(1);
  if (!revision) throw new AmendmentError(404, "no such revision");
  verifySigned(input.actor, () =>
    amendmentMessage({
      act: input.kind,
      amendmentId: input.amendmentId,
      revision: input.revision,
      contentHash: revision.contentHash,
      address: input.actor.via === "key" ? input.actor.address : "",
    }),
  );
  const supporter = supporterRef(input.actor);
  return db.transaction(async (tx) => {
    // A row that changes nothing is refused, not written: supporting twice, or
    // withdrawing what was never given, would only lengthen the record.
    const [latest] = await tx
      .select({ kind: lawAmendmentSupports.kind })
      .from(lawAmendmentSupports)
      .where(
        and(
          eq(lawAmendmentSupports.revisionId, revision.id),
          eq(lawAmendmentSupports.supporter, supporter),
        ),
      )
      .orderBy(desc(lawAmendmentSupports.recordedAt))
      .limit(1);
    if ((latest?.kind ?? "withdraw") === input.kind) {
      throw new AmendmentError(
        409,
        input.kind === "support"
          ? "you already support this revision"
          : "you do not support this revision",
      );
    }
    await tx.insert(lawAmendmentSupports).values({
      revisionId: revision.id,
      supporter,
      kind: input.kind,
      proof: proofOf(input.actor),
      signature: input.actor.via === "key" ? input.actor.signature : null,
    });
    await appendEvent(tx, {
      type: input.kind === "support" ? "supported" : "withdrawn",
      amendmentId: input.amendmentId,
      payload: {
        revision: input.revision,
        contentHash: revision.contentHash,
        supporter,
        proof: proofOf(input.actor),
      },
    });
    const rows = await tx
      .select()
      .from(lawAmendmentSupports)
      .where(eq(lawAmendmentSupports.revisionId, revision.id));
    return countSupport(
      rows.map((r) => ({
        ...r,
        kind: r.kind as SupportKind,
        proof: r.proof as "ACCOUNT" | "BIP137",
      })),
    );
  });
}

export interface RevisionView {
  id: string;
  revision: number;
  title: string;
  rationale: string;
  lang: string;
  baseVersionId: string;
  changes: Change[];
  contentHash: string;
  author: string;
  proof: string;
  signature: string | null;
  recordedAt: string;
  support: SupportCount;
}

export interface AmendmentView {
  id: string;
  authority: string;
  actId: string;
  author: string;
  forkedFromRevisionId: string | null;
  recordedAt: string;
  revisions: RevisionView[];
  /** The latest revision against the law as held now. */
  standing: ReturnType<typeof standing>;
  /** The ways this act's law is officially changed from outside, with their sources. */
  routes: OfficialRoute[];
  /** The latest revision's effect on the act, with a redline per changed provision. */
  amended: (AmendedProvision & { redline?: ReturnType<typeof redline> })[];
}

async function supportsByRevision(db: Reader, revisionIds: string[]) {
  if (revisionIds.length === 0) return new Map<string, SupportCount>();
  const rows = await db
    .select()
    .from(lawAmendmentSupports)
    .where(inArray(lawAmendmentSupports.revisionId, revisionIds));
  return new Map(
    revisionIds.map((id) => [
      id,
      countSupport(
        rows
          .filter((r) => r.revisionId === id)
          .map((r) => ({
            ...r,
            kind: r.kind as SupportKind,
            proof: r.proof as "ACCOUNT" | "BIP137",
          })),
      ),
    ]),
  );
}

/** One amendment, every revision, and what its latest would do to the law. */
export async function loadAmendment(db: Reader, id: string): Promise<AmendmentView | null> {
  const [amendment] = await db
    .select()
    .from(lawAmendments)
    .where(eq(lawAmendments.id, id))
    .limit(1);
  if (!amendment) return null;
  const revisions = await db
    .select()
    .from(lawAmendmentRevisions)
    .where(eq(lawAmendmentRevisions.amendmentId, id))
    .orderBy(asc(lawAmendmentRevisions.revision));
  const latest = revisions.at(-1)!;
  const changes = latest.changes as Change[];
  const base = await provisionsOf(db, latest.baseVersionId);
  const now = await versionInForce(db, amendment.actId, latest.lang);
  const support = await supportsByRevision(
    db,
    revisions.map((r) => r.id),
  );
  const [act] = await db
    .select({ kind: legalActs.kind })
    .from(legalActs)
    .where(eq(legalActs.id, amendment.actId))
    .limit(1);
  return {
    id: amendment.id,
    authority: amendment.authority,
    actId: amendment.actId,
    author: amendment.author,
    forkedFromRevisionId: amendment.forkedFromRevisionId,
    recordedAt: amendment.recordedAt.toISOString(),
    revisions: revisions.map((r) => ({
      id: r.id,
      revision: r.revision,
      title: r.title,
      rationale: r.rationale,
      lang: r.lang,
      baseVersionId: r.baseVersionId,
      changes: r.changes as Change[],
      contentHash: r.contentHash,
      author: r.author,
      proof: r.proof,
      signature: r.signature,
      recordedAt: r.recordedAt.toISOString(),
      support: support.get(r.id)!,
    })),
    standing: now
      ? now.id === latest.baseVersionId
        ? { state: "current" }
        : standing(await provisionsOf(db, now.id), changes)
      : { state: "outdated", problems: [] },
    routes: routesFor(amendment.authority, act?.kind ?? "other"),
    amended: applyChanges(base, changes).map((p) =>
      p.status === "replaced" ? { ...p, redline: redline(p.before.text, p.text) } : p,
    ),
  };
}

export interface AmendmentSummary {
  id: string;
  authority: string;
  actId: string;
  title: string;
  revision: number;
  recordedAt: string;
  support: SupportCount;
}

/** The amendments to an act or an authority's law, newest first, with their latest revision's support. */
export async function listAmendments(
  db: Reader,
  filter: { authority?: string; actId?: string; limit?: number },
): Promise<AmendmentSummary[]> {
  const conditions = [
    filter.authority ? eq(lawAmendments.authority, filter.authority) : undefined,
    filter.actId ? eq(lawAmendments.actId, filter.actId) : undefined,
  ].filter(Boolean);
  const amendments = await db
    .select()
    .from(lawAmendments)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(lawAmendments.recordedAt))
    .limit(Math.min(filter.limit ?? 50, 200));
  if (amendments.length === 0) return [];
  const revisions = await db
    .select()
    .from(lawAmendmentRevisions)
    .where(
      inArray(
        lawAmendmentRevisions.amendmentId,
        amendments.map((a) => a.id),
      ),
    );
  const latest = new Map<string, (typeof revisions)[number]>();
  for (const r of revisions) {
    const seen = latest.get(r.amendmentId);
    if (!seen || r.revision > seen.revision) latest.set(r.amendmentId, r);
  }
  const support = await supportsByRevision(
    db,
    [...latest.values()].map((r) => r.id),
  );
  return amendments.map((a) => {
    const r = latest.get(a.id)!;
    return {
      id: a.id,
      authority: a.authority,
      actId: a.actId,
      title: r.title,
      revision: r.revision,
      recordedAt: a.recordedAt.toISOString(),
      support: support.get(r.id)!,
    };
  });
}

/** The chained log from after a sequence number, for anyone to verify with verifyChain. */
export async function readLog(db: Reader, after: number, limit = 500) {
  const rows = await db
    .select()
    .from(lawAmendmentEvents)
    .where(gt(lawAmendmentEvents.seq, after))
    .orderBy(asc(lawAmendmentEvents.seq))
    .limit(Math.min(limit, 1000));
  return rows.map((r) => ({ ...r, recordedAt: r.recordedAt.toISOString() }));
}
