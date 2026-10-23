/**
 * The law register (design: docs/design/2026-10-law-as-data.md §3), step L0:
 * which acts exist, who enacted them, what they are called and how they are
 * numbered. No text yet; versions and provisions arrive with L1.
 *
 * Same rules as places-schema.ts: ids minted in the app, nothing deleted,
 * every row cites a `sources` row, and no authority, kind or scheme appears in
 * this file (they are rows in src/lib/config/law).
 */
import { sql } from "drizzle-orm";
import {
  boolean,
  foreignKey,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { randomUUID } from "node:crypto";
import { jurisdictions, sources } from "./places-schema";

const uuid = () => randomUUID();
const recordedAt = () =>
  timestamp("recorded_at", { precision: 3, mode: "date" }).notNull().defaultNow();
const supersededAt = () => timestamp("superseded_at", { precision: 3, mode: "date" });

/** An act as a stable work. What the register last said about it is on its rows. */
export const legalActs = pgTable(
  "legal_acts",
  {
    id: text("id").primaryKey().$defaultFn(uuid),
    /** Key in config LAW_AUTHORITIES. */
    authority: text("authority").notNull(),
    /** The place the authority speaks for, when Places holds it. */
    jurisdictionId: text("jurisdiction_id"),
    /** Key in config ACT_KINDS. */
    kind: text("kind").notNull(),
    /** What the register said about being in force when it was last read. */
    inForce: boolean("in_force").notNull(),
    /** The register last listed this act in the run that wrote this row. */
    sourceId: text("source_id").notNull(),
    recordedAt: recordedAt(),
    updatedAt: timestamp("updated_at", { precision: 3, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("legal_acts_authority_idx").on(t.authority),
    foreignKey({
      columns: [t.jurisdictionId],
      foreignColumns: [jurisdictions.id],
      name: "legal_acts_jurisdiction_id_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [t.sourceId],
      foreignColumns: [sources.id],
      name: "legal_acts_source_id_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ],
);

/** Many per act. Lookups are by (scheme, value), never by name. */
export const legalActIdentifiers = pgTable(
  "legal_act_identifiers",
  {
    id: text("id").primaryKey().$defaultFn(uuid),
    actId: text("act_id").notNull(),
    /** Key in config ACT_IDENTIFIER_SCHEMES. */
    scheme: text("scheme").notNull(),
    value: text("value").notNull(),
    sourceId: text("source_id").notNull(),
    recordedAt: recordedAt(),
    supersededAt: supersededAt(),
  },
  (t) => [
    // A register's id names one act; a number only within its authority, which
    // the act carries, so uniqueness is per act and scheme.
    uniqueIndex("legal_act_identifiers_act_scheme_key")
      .on(t.actId, t.scheme)
      .where(sql`${t.supersededAt} IS NULL`),
    index("legal_act_identifiers_scheme_value_idx").on(t.scheme, t.value),
    foreignKey({
      columns: [t.actId],
      foreignColumns: [legalActs.id],
      name: "legal_act_identifiers_act_id_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [t.sourceId],
      foreignColumns: [sources.id],
      name: "legal_act_identifiers_source_id_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ],
);

/** What an act is called, per language. A changed title supersedes, never overwrites. */
export const legalActNames = pgTable(
  "legal_act_names",
  {
    id: text("id").primaryKey().$defaultFn(uuid),
    actId: text("act_id").notNull(),
    /** BCP 47. */
    locale: text("locale").notNull(),
    /** Key in config ACT_NAME_KINDS. */
    kind: text("kind").notNull(),
    text: text("text").notNull(),
    sourceId: text("source_id").notNull(),
    recordedAt: recordedAt(),
    supersededAt: supersededAt(),
  },
  (t) => [
    uniqueIndex("legal_act_names_act_locale_kind_key")
      .on(t.actId, t.locale, t.kind)
      .where(sql`${t.supersededAt} IS NULL`),
    foreignKey({
      columns: [t.actId],
      foreignColumns: [legalActs.id],
      name: "legal_act_names_act_id_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [t.sourceId],
      foreignColumns: [sources.id],
      name: "legal_act_names_source_id_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ],
);
