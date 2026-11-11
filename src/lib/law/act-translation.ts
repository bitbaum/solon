/**
 * One page of an act in the reader's language: the title, the headings and the
 * texts of its provisions, each from the translation cache when Solon holds
 * one, else the authentic words. Says whether the page is wholly translated,
 * so the page knows whether to ask for the rest.
 */
import type { Database } from "@/lib/db/client";
import { cachedTranslations, textHash } from "./translate";
import type { ActView } from "./view";

/** The words of a page an act shows: its title, then each provision's heading and text. */
export const passagesOf = (act: ActView): string[] =>
  [act.title ?? "", ...act.provisions.flatMap((p) => [p.heading, p.text])].filter(
    (p) => p.trim() !== "",
  );

export interface ActTranslation {
  /** The language the page is translated into. */
  lang: string;
  /** The language of the authentic text. */
  from: string;
  title: string | null;
  provisions: { path: string; heading: string; text: string }[];
  /** Every passage of the page is translated. */
  complete: boolean;
}

/** The page in `lang`, when its authentic text is in another language; null when it is not. */
export async function actTranslation(
  db: Database,
  act: ActView,
  lang: string,
): Promise<ActTranslation | null> {
  if (!act.version || act.version.lang === lang) return null;
  const passages = passagesOf(act);
  const held = await cachedTranslations(db, passages, lang);
  const pick = (text: string) => (text.trim() === "" ? text : (held.get(textHash(text)) ?? null));
  let missing = 0;
  const or = (text: string) => {
    const found = pick(text);
    if (found === null) missing++;
    return found ?? text;
  };
  return {
    lang,
    from: act.version.lang,
    title: act.title === null ? null : or(act.title),
    provisions: act.provisions.map((p) => ({
      path: p.path,
      heading: or(p.heading),
      text: or(p.text),
    })),
    complete: missing === 0,
  };
}
