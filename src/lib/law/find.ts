/**
 * Finding the law the way a person types it (design:
 * docs/design/2026-11-law-navigation.md). The fleet's one search is
 * `@bitbaum/searchkit`; this is how the law goes through it, as OrangeCat's
 * ⌘K and Solon's places do:
 *
 *   1. The vocabulary — every word of every act title in force — is built once
 *      and kept five minutes.
 *   2. What was typed is expanded into the words of that vocabulary it could
 *      mean within searchkit's typo budget, so "Mietzis" also asks for "Mietzins".
 *   3. The database returns candidates: titles holding the typed or corrected
 *      words (folded alike, so "zurich" finds Zürich), and provisions through
 *      the full-text index.
 *   4. searchkit ranks the titles and returns the ranges to mark. Provisions
 *      keep `searchProvisions`' own order, which prefers the fundamental act;
 *      their excerpt carries the marks.
 *
 * When nothing matches, `suggestion` is the closest query made of words that exist.
 */
import {
  candidates,
  createVocabulary,
  didYouMean,
  rerank,
  tokenize,
  umlautSpelling,
  words,
  type Range,
  type Vocabulary,
} from "@bitbaum/searchkit";
import { sql, type SQL } from "drizzle-orm";
import type { Database } from "@/lib/db/client";
import { foldName, foldedSql } from "@/lib/places/fold";
import type { ActSearchHit } from "./register/coverage";
import { searchProvisions, type ProvisionHit } from "./search";

const VOCABULARY_TTL_MS = 5 * 60 * 1000;
/** Corrected spellings asked of the database per typed word: enough for a slip, bounded for the query. */
const CORRECTIONS_PER_WORD = 3;
const ACT_CANDIDATES = 120;

interface LawVocabulary {
  vocab: Vocabulary;
  /** A folded word as the titles write it ("zurich" → "zürich"), for the text index, which does not fold. */
  written: Map<string, string>;
}

const cache = new WeakMap<Database, { at: number; value: LawVocabulary }>();

/** The words of every act title in force, as searchkit compares them. */
export async function lawVocabulary(db: Database): Promise<LawVocabulary> {
  const hit = cache.get(db);
  if (hit && Date.now() - hit.at < VOCABULARY_TTL_MS) return hit.value;
  const rows = await db.execute(sql`
    SELECT DISTINCT n.text AS title
    FROM legal_act_names n
    JOIN legal_acts a ON a.id = n.act_id AND a.in_force
    WHERE n.kind = 'title' AND n.superseded_at IS NULL
  `);
  const written = new Map<string, string>();
  const entries = (rows.rows as { title: string }[]).flatMap(({ title }) =>
    tokenize(title).flatMap((token) => {
      if (!written.has(token.term))
        written.set(token.term, title.slice(token.start, token.end).toLowerCase());
      // Also as typed without its umlaut ("zuerich"), as searchkit indexes it.
      const spelt = umlautSpelling(title.slice(token.start, token.end));
      return spelt ? [token.term, spelt] : [token.term];
    }),
  );
  const value = { vocab: createVocabulary(entries), written };
  cache.set(db, { at: Date.now(), value });
  return value;
}

export interface QueryWords {
  /** Each typed word with the spellings the titles know that it could mean (the typed one first). */
  perWord: { typed: string; spellings: string[] }[];
}

/** The typed words, each with the title words one slip away; a word no title comes near is kept as typed. */
export function expandWords(query: string, { vocab, written }: LawVocabulary): QueryWords {
  return {
    perWord: [...new Set(words(query))].map((typed) => {
      const near = candidates(vocab, typed, { limit: 100 })
        .filter((c) => c.typos > 0)
        .slice(0, CORRECTIONS_PER_WORD)
        .map((c) => written.get(c.term) ?? c.term);
      return { typed, spellings: [typed, ...near] };
    }),
  };
}

const titleHolds = (text: string): SQL =>
  sql`${foldedSql(sql`n.text`)} LIKE ${`%${foldName(text).replace(/[\\%_]/g, "\\$&")}%`}`;

/** A typed phrase as ideas for `searchProvisions`: each word with the spellings the titles know, so a slip still finds it. */
export async function queryGroups(db: Database, query: string): Promise<string[][]> {
  const { perWord } = expandWords(query.slice(0, 200), await lawVocabulary(db));
  return perWord.map((w) => w.spellings);
}

export interface FoundAct extends ActSearchHit {
  /** What matched in `title`, as ranges into it. */
  marks: Range[];
}

/** Acts whose title holds the typed words (or words one slip away), ranked by searchkit. */
export async function findActs(
  db: Database,
  input: { query: string; authority?: string; limit?: number },
  vocabulary?: LawVocabulary,
): Promise<FoundAct[]> {
  const query = input.query.trim().slice(0, 100);
  if (!query) return [];
  const { perWord } = expandWords(query, vocabulary ?? (await lawVocabulary(db)));
  const everyWord = perWord.map((w) => sql`(${sql.join(w.spellings.map(titleHolds), sql` OR `)})`);
  const rows = await db.execute(sql`
    SELECT a.id, a.authority, a.kind, a.in_force AS "inForce",
           n.text AS title, num.value AS "systematicNumber", ou.value AS "officialUrl"
    FROM legal_acts a
    JOIN legal_act_names n ON n.act_id = a.id AND n.kind = 'title' AND n.superseded_at IS NULL
    LEFT JOIN legal_act_identifiers num
      ON num.act_id = a.id AND num.scheme = 'systematic_number' AND num.superseded_at IS NULL
    LEFT JOIN legal_act_identifiers ou
      ON ou.act_id = a.id AND ou.scheme = 'official_url' AND ou.superseded_at IS NULL
    WHERE a.in_force
      AND (${input.authority ?? null}::text IS NULL OR a.authority = ${input.authority ?? null})
      AND (${titleHolds(query)} OR (${sql.join(everyWord.length ? everyWord : [sql`false`], sql` AND `)}))
    ORDER BY length(n.text)
    LIMIT ${ACT_CANDIDATES}
  `);
  const found = (rows.rows as unknown as Omit<FoundAct, "marks" | "lexfindId">[]).map((r) => ({
    ...r,
    lexfindId: null,
  }));
  return rerank(
    found,
    {
      fields: [
        { name: "title", get: (a) => a.title },
        { name: "number", get: (a) => a.systematicNumber },
      ],
    },
    query,
  )
    .map(({ item, hit }) => ({ ...item, marks: hit?.matches.title ?? [] }))
    .slice(0, input.limit ?? 20);
}

export interface LawFound {
  acts: FoundAct[];
  provisions: ProvisionHit[];
  /** The closest query of existing words, when nothing matched. */
  suggestion: string | null;
}

/** Titles and text for what was typed, with typos forgiven and a "did you mean" when nothing matches. */
export async function findLaw(
  db: Database,
  input: { query: string; authority?: string; actLimit?: number; textLimit?: number },
): Promise<LawFound> {
  const query = input.query.trim().slice(0, 200);
  if (!query) return { acts: [], provisions: [], suggestion: null };
  const vocabulary = await lawVocabulary(db);
  const { perWord } = expandWords(query, vocabulary);
  const [acts, provisions] = await Promise.all([
    findActs(db, { query, authority: input.authority, limit: input.actLimit }, vocabulary),
    // Each typed word is one idea whose alternatives are its corrected spellings: all ideas first, then the first alone.
    searchProvisions(db, {
      groups: perWord.map((w) => w.spellings),
      authority: input.authority,
      limit: input.textLimit ?? 10,
    }),
  ]);
  return {
    acts,
    provisions,
    suggestion:
      acts.length === 0 && provisions.length === 0 ? didYouMean(query, vocabulary.vocab) : null,
  };
}
