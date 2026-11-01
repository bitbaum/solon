import { LAW_AUTHORITIES } from "@/lib/config/law";
import { AUTHORITY_ALIASES } from "@/lib/config/law/aliases";

const plain = (text: string): string =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9. -]+/g, " ");

const word = (haystack: string, alias: string): boolean =>
  new RegExp(`(^|[^a-z0-9])${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`).test(
    haystack,
  );

/**
 * The authorities a text names, by any of their names. "Zürich" names the canton
 * and the city (the city's rules apply there too); "Basel" and "Appenzell"
 * name both halves. The Confederation is not detected here: it is always asked.
 */
export function authoritiesNamed(text: string): string[] {
  const haystack = ` ${plain(text)} `;
  const found = new Set<string>();
  for (const authority of LAW_AUTHORITIES) {
    if (authority.key === "ch") continue;
    for (const alias of AUTHORITY_ALIASES[authority.key] ?? []) {
      if (word(haystack, plain(alias))) found.add(authority.key);
    }
  }
  if (found.has("zh") && !found.has("bfs261") && /\b(stadt|city|ville|citta)\b/.test(haystack)) {
    found.add("bfs261");
  }
  // The city's own collection applies wherever Zürich is meant.
  if (found.has("zh")) found.add("bfs261");
  // A commune's law sits within its canton's or country's: Vaduz is asked with Liechtenstein.
  for (const key of [...found]) {
    const within = LAW_AUTHORITIES.find((a) => a.key === key)?.within;
    if (within && within !== "ch") found.add(within);
  }
  return [...found];
}
