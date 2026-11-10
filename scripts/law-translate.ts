/**
 * Translates the titles of an authority's acts into the site's languages ahead
 * of readers, so lists of acts read in the reader's language from the first
 * visit (src/lib/law/translate.ts). Texts are translated when a page is first
 * read; titles are asked for here because a list shows hundreds at once.
 *
 *   pnpm run law:translate --authority rso                 every title, every language
 *   pnpm run law:translate --authority rso --to en,de      some languages
 *   pnpm run law:translate --authority rso --limit 200     a few at a time
 *
 * Needs the model keys the assistants use (ai-kit's chain for SOLON). Safe to
 * stop and rerun: a title already translated is not asked again.
 */
import { complete, freeChain, usableChain } from "@bitbaum/ai-kit";
import { sql } from "drizzle-orm";
import { locales } from "@/i18n/routing";
import { db } from "@/lib/db/client";
import { rowsOf } from "@/lib/db/rows";
import { translateMissing } from "@/lib/law/translate";

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};

async function main(): Promise<number> {
  const authority = arg("authority");
  if (!authority) {
    console.error("name an authority: --authority <key>");
    return 2;
  }
  const targets = (arg("to")?.split(",") ?? [...locales]).filter((l) =>
    (locales as readonly string[]).includes(l),
  );
  const limit = Number(arg("limit") ?? "100000");
  const chain = usableChain(freeChain("SOLON"), process.env);
  if (!chain.length) {
    console.error("no model is configured (ai-kit chain SOLON)");
    return 2;
  }
  const titles = rowsOf<{ text: string; locale: string }>(
    await db.execute(sql`
      SELECT DISTINCT n.text, n.locale FROM legal_act_names n
      JOIN legal_acts a ON a.id = n.act_id
      WHERE a.authority = ${authority} AND n.kind = 'title' AND n.superseded_at IS NULL
      ORDER BY n.text LIMIT ${limit}`),
  );
  const ask = (messages: Parameters<typeof complete>[0]["messages"]) =>
    complete({ messages, chain, env: process.env, maxTokens: 6000, timeoutMs: 90_000 }).then(
      (r) => ({ text: r.text, id: r.id }),
    );
  for (const to of targets) {
    const byLang = new Map<string, string[]>();
    for (const t of titles)
      if (t.locale !== to) byLang.set(t.locale, [...(byLang.get(t.locale) ?? []), t.text]);
    for (const [from, texts] of byLang) {
      const result = await translateMissing(db, texts, from, to, ask);
      console.log(
        `${authority} ${from} → ${to}: ${result.kept} translated, ${result.failed} failed`,
      );
    }
  }
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(2);
  });
