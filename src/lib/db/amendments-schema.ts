/**
 * Amendments to the law (design: docs/design/2026-11-amending-the-law.md).
 *
 * Nothing here is ever updated or deleted: an amendment and its revisions are
 * written once, support and withdrawal are both new rows, and every act is an
 * event in one hash-chained log. Status is derived on read, never stored.
 */
import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { randomUUID } from "node:crypto";
import { legalActVersions, legalActs } from "./law-schema";

const uuid = () => randomUUID();
const recordedAt = () =>
  timestamp("recorded_at", { precision: 3, mode: "date" }).notNull().defaultNow();

/** One proposed change to one act, stable across its revisions. */
export const lawAmendments = pgTable(
  "law_amendments",
  {
    id: text("id").primaryKey().$defaultFn(uuid),
    /** Key in config LAW_AUTHORITIES. */
    authority: text("authority").notNull(),
    actId: text("act_id").notNull(),
    /** Who started it: `actor:<id>` or `btc:<address>`. Only they may file its next revision. */
    author: text("author").notNull(),
    /** The revision this one was forked from, when it is a fork. */
    forkedFromRevisionId: text("forked_from_revision_id"),
    recordedAt: recordedAt(),
  },
  (t) => [
    index("law_amendments_act_idx").on(t.actId),
    index("law_amendments_authority_idx").on(t.authority),
    foreignKey({
      columns: [t.actId],
      foreignColumns: [legalActs.id],
      name: "law_amendments_act_id_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ],
);

/** What an amendment says at one revision. Immutable; support binds to its hash. */
export const lawAmendmentRevisions = pgTable(
  "law_amendment_revisions",
  {
    id: text("id").primaryKey().$defaultFn(uuid),
    amendmentId: text("amendment_id").notNull(),
    /** 1, 2, 3 … within the amendment. */
    revision: integer("revision").notNull(),
    /** BCP 47; the language of the act version it amends. */
    lang: text("lang").notNull(),
    /** The act version the changes were written against. */
    baseVersionId: text("base_version_id").notNull(),
    title: text("title").notNull(),
    rationale: text("rationale").notNull(),
    /** The changes: see ChangeSchema in src/lib/law/amend/changes.ts. */
    changes: jsonb("changes").notNull(),
    /** sha256 of the canonical revision content (src/lib/law/amend/hash.ts). */
    contentHash: text("content_hash").notNull(),
    /** `actor:<id>` or `btc:<address>`; the amendment's author. */
    author: text("author").notNull(),
    /** ACCOUNT or BIP137. */
    proof: text("proof").notNull(),
    /** Bitcoin signed-message signature over amendmentMessage(act: "file"); null for ACCOUNT. */
    signature: text("signature"),
    recordedAt: recordedAt(),
  },
  (t) => [
    uniqueIndex("law_amendment_revisions_amendment_revision_key").on(t.amendmentId, t.revision),
    check("law_amendment_revisions_revision_check", sql`${t.revision} >= 1`),
    check("law_amendment_revisions_proof_check", sql`${t.proof} IN ('ACCOUNT', 'BIP137')`),
    check(
      "law_amendment_revisions_signature_check",
      sql`(${t.proof} = 'BIP137') = (${t.signature} IS NOT NULL)`,
    ),
    foreignKey({
      columns: [t.amendmentId],
      foreignColumns: [lawAmendments.id],
      name: "law_amendment_revisions_amendment_id_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [t.baseVersionId],
      foreignColumns: [legalActVersions.id],
      name: "law_amendment_revisions_base_version_id_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ],
);

/** A person standing behind a revision, or no longer. Append-only; the latest row per supporter counts. */
export const lawAmendmentSupports = pgTable(
  "law_amendment_supports",
  {
    id: text("id").primaryKey().$defaultFn(uuid),
    revisionId: text("revision_id").notNull(),
    /** `actor:<id>` or `btc:<address>`. */
    supporter: text("supporter").notNull(),
    /** support | withdraw */
    kind: text("kind").notNull(),
    proof: text("proof").notNull(),
    signature: text("signature"),
    recordedAt: recordedAt(),
  },
  (t) => [
    index("law_amendment_supports_revision_idx").on(t.revisionId, t.supporter),
    check("law_amendment_supports_kind_check", sql`${t.kind} IN ('support', 'withdraw')`),
    check("law_amendment_supports_proof_check", sql`${t.proof} IN ('ACCOUNT', 'BIP137')`),
    check(
      "law_amendment_supports_signature_check",
      sql`(${t.proof} = 'BIP137') = (${t.signature} IS NOT NULL)`,
    ),
    foreignKey({
      columns: [t.revisionId],
      foreignColumns: [lawAmendmentRevisions.id],
      name: "law_amendment_supports_revision_id_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ],
);

/**
 * Every act on an amendment, in one chain: each event carries the hash of the
 * one before it (src/lib/law/amend/hash.ts), so anyone holding the log can
 * tell if an event was removed or altered.
 */
export const lawAmendmentEvents = pgTable(
  "law_amendment_events",
  {
    seq: bigint("seq", { mode: "number" }).primaryKey(),
    prevHash: text("prev_hash").notNull(),
    hash: text("hash").notNull(),
    /** filed | revised | forked | supported | withdrawn */
    type: text("type").notNull(),
    amendmentId: text("amendment_id").notNull(),
    payload: jsonb("payload").notNull(),
    recordedAt: recordedAt(),
  },
  (t) => [
    uniqueIndex("law_amendment_events_hash_key").on(t.hash),
    uniqueIndex("law_amendment_events_prev_hash_key").on(t.prevHash),
    index("law_amendment_events_amendment_idx").on(t.amendmentId, t.seq),
    check("law_amendment_events_seq_check", sql`${t.seq} >= 1`),
  ],
);

export type LawAmendment = typeof lawAmendments.$inferSelect;
export type LawAmendmentRevision = typeof lawAmendmentRevisions.$inferSelect;
export type LawAmendmentSupport = typeof lawAmendmentSupports.$inferSelect;
export type LawAmendmentEvent = typeof lawAmendmentEvents.$inferSelect;
