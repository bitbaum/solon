/**
 * An act's title as one value: its current title in the reader's language,
 * else in the first of its other languages. A bare join on the titles gives
 * one row per language an act is held in, so a list repeats an act once its
 * text is held twice, and "the" title is whichever row comes first.
 */
import { sql, type SQL } from "drizzle-orm";

export const actTitleSql = (actId: SQL, locale: string): SQL =>
  sql`(SELECT n.text FROM legal_act_names n
       WHERE n.act_id = ${actId} AND n.kind = 'title' AND n.superseded_at IS NULL
       ORDER BY (n.locale = ${locale}) DESC, n.locale
       LIMIT 1)`;
