/**
 * The law's words in the reader's language. The authentic text stays the law
 * and is always one click away; a translation is Solon's, made by a model,
 * labelled as such wherever it is shown, and kept in a cache keyed by the
 * hash of the words it translates (`text_translations`), so each passage is
 * translated once and a changed passage is translated again.
 *
 * A model's answer is checked before it is kept: one translation per passage
 * asked for, none empty, and every number in a passage still in its
 * translation. An answer that fails is dropped and the page keeps showing the
 * authentic words.
 */
import { createHash } from "node:crypto";
import type { ChatMessage } from "@bitbaum/ai-kit";
import { sql } from "drizzle-orm";
import type { Database } from "@/lib/db/client";
import { rowsOf } from "@/lib/db/rows";
import { textTranslations } from "@/lib/db/law-schema";

export const textHash = (text: string) => createHash("sha256").update(text).digest("hex");

/** A language's English name, for the instruction to the model. */
const languageName = (code: string) =>
  new Intl.DisplayNames(["en"], { type: "language" }).of(code) ?? code;

/** Passages per request and characters per request: small enough that a model returns them whole. */
export const BATCH = { items: 12, chars: 8000 } as const;

export function translationPrompt(
  passages: readonly string[],
  from: string,
  to: string,
): ChatMessage[] {
  return [
    {
      role: "system",
      content: [
        `You translate the text of laws from ${languageName(from)} into ${languageName(to)}.`,
        "You receive a JSON array of passages. Answer with a JSON array of the same length: the translation of each passage, in the same order, and nothing else.",
        "Translate faithfully and completely: do not summarise, explain, add or leave out anything. Keep every number, date, article and paragraph reference exactly as it is. Keep line breaks. Use the legal terms a lawyer in that language would use.",
      ].join("\n"),
    },
    { role: "user", content: JSON.stringify(passages) },
  ];
}

/** The digit runs of a text, sorted: "9 108 338,6" and "9,108,338.6" both give 108 338 6 9. */
export const numbersOf = (text: string) => (text.match(/\d+/g) ?? []).sort();

/** The translations in a model's answer, or null when the answer cannot be trusted. */
export function readTranslation(answer: string, passages: readonly string[]): string[] | null {
  const start = answer.indexOf("[");
  const end = answer.lastIndexOf("]");
  if (start < 0 || end <= start) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(answer.slice(start, end + 1));
  } catch {
    return null;
  }
  if (!Array.isArray(parsed) || parsed.length !== passages.length) return null;
  const out: string[] = [];
  for (const [i, item] of parsed.entries()) {
    const source = passages[i]!;
    if (typeof item !== "string" || item.trim() === "") return null;
    // A translation that loses or invents a number is not kept.
    if (numbersOf(item).join(" ") !== numbersOf(source).join(" ")) return null;
    // Nor one many times longer or shorter than what it translates.
    const ratio = item.length / Math.max(1, source.length);
    if (source.length > 40 && (ratio < 0.3 || ratio > 3)) return null;
    out.push(item);
  }
  return out;
}

/** The translations Solon holds for these words into `target`, by the words' hash. */
export async function cachedTranslations(
  db: Database,
  texts: readonly string[],
  target: string,
): Promise<Map<string, string>> {
  const hashes = [...new Set(texts.map(textHash))];
  if (hashes.length === 0) return new Map();
  const rows = rowsOf<{ source_sha256: string; text: string }>(
    await db.execute(sql`
      SELECT source_sha256, text FROM text_translations
      WHERE target_lang = ${target} AND source_sha256 IN (${sql.join(
        hashes.map((h) => sql`${h}`),
        sql`, `,
      )})`),
  );
  return new Map(rows.map((r) => [r.source_sha256, r.text]));
}

/** Groups of passages small enough for one request each. */
export function batches(passages: readonly string[]): string[][] {
  const out: string[][] = [];
  let current: string[] = [];
  let chars = 0;
  for (const p of passages) {
    if (current.length > 0 && (current.length >= BATCH.items || chars + p.length > BATCH.chars)) {
      out.push(current);
      current = [];
      chars = 0;
    }
    current.push(p);
    chars += p.length;
  }
  if (current.length > 0) out.push(current);
  return out;
}

export type Ask = (messages: ChatMessage[]) => Promise<{ text: string; id: string }>;

/**
 * Translates the passages Solon does not hold a translation of yet, and keeps
 * those whose translation passes the checks. Returns how many were kept and
 * how many failed; a failed passage is asked again on a later request.
 */
export async function translateMissing(
  db: Database,
  passages: readonly string[],
  from: string,
  to: string,
  ask: Ask,
): Promise<{ kept: number; failed: number }> {
  if (from === to) return { kept: 0, failed: 0 };
  const held = await cachedTranslations(db, passages, to);
  const missing = [...new Set(passages)].filter((p) => p.trim() !== "" && !held.has(textHash(p)));
  let kept = 0;
  let failed = 0;
  for (const batch of batches(missing)) {
    const answer = await ask(translationPrompt(batch, from, to)).catch(() => null);
    const translated = answer ? readTranslation(answer.text, batch) : null;
    if (!answer || !translated) {
      failed += batch.length;
      continue;
    }
    await db
      .insert(textTranslations)
      .values(
        batch.map((source, i) => ({
          sourceSha256: textHash(source),
          sourceLang: from,
          targetLang: to,
          text: translated[i]!,
          translator: answer.id,
        })),
      )
      .onConflictDoNothing();
    kept += batch.length;
  }
  return { kept, failed };
}

/** The titles of a list of acts in the reader's language, by act id, where Solon holds a translation. */
export async function translatedTitles(
  db: Database,
  acts: readonly { id: string; title: string | null }[],
  locale: string,
): Promise<Map<string, string>> {
  const held = await cachedTranslations(
    db,
    acts.flatMap((a) => (a.title ? [a.title] : [])),
    locale,
  );
  return new Map(
    acts.flatMap((a) => {
      const translated = a.title ? held.get(textHash(a.title)) : undefined;
      return translated ? [[a.id, translated] as const] : [];
    }),
  );
}
