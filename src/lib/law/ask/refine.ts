/**
 * A second look at what the first search found. A search finds words, not
 * meaning: it returns the rule about hunting dogs beside the rule about wild
 * animals. The model reads the headings, says which provisions bear on the
 * question and, if the obvious one is missing (the permit rule, the canton's own
 * act), names one or two further searches. Failing that, nothing is lost: the
 * first results stand.
 */
import { LAW_AUTHORITIES } from "@/lib/config/law";
import type { Database } from "@/lib/db/client";
import { searchProvisions, type ProvisionHit } from "../search";
import type { Completer, Plan } from "./plan";

export const MAX_KEPT = 14;
const KEYS = new Set(LAW_AUTHORITIES.map((a) => a.key));

interface Review {
  relevant: number[];
  missing: { authorities: string[]; groups: string[][] }[];
}

const PROMPT = `You check the result of a search of Swiss and Liechtenstein law. Reply with JSON only:
{"relevant": [0, 3], "missing": [{"authorities": ["ch"], "groups": [["..."], ["..."]]}]}

- relevant: the numbers of the provisions that bear on the question. A provision about a different subject that happens to share a word is not relevant.
- missing: 0 to 2 further searches, only when an obvious provision is not among those found (the permit rule, the duty, the canton's own act). authorities: keys from ${LAW_AUTHORITIES.map((a) => a.key).join(", ")}. groups: 2 ideas, each 2 to 4 stems as the law words them, in German (French or Italian for places that speak them). Leave "missing" empty when the found provisions are enough.`;

const numbers = (value: unknown): number[] =>
  Array.isArray(value) ? value.filter((n): n is number => Number.isInteger(n)) : [];

function parse(text: string): Review | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const raw = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
    const missing = (Array.isArray(raw.missing) ? raw.missing : []).slice(0, 2).flatMap((m) => {
      const item = m as { authorities?: unknown; groups?: unknown };
      const authorities = (Array.isArray(item.authorities) ? item.authorities : []).filter(
        (key): key is string => typeof key === "string" && KEYS.has(key),
      );
      const groups = (Array.isArray(item.groups) ? item.groups : [])
        .map((g) =>
          Array.isArray(g) ? g.filter((t): t is string => typeof t === "string").slice(0, 6) : [],
        )
        .filter((g) => g.length > 0)
        .slice(0, 3);
      return authorities.length && groups.length ? [{ authorities, groups }] : [];
    });
    return { relevant: numbers(raw.relevant), missing };
  } catch {
    return null;
  }
}

const idOf = (hit: ProvisionHit): string => `${hit.actId}#${hit.path}`;

export async function refine(
  db: Database,
  ask: Completer,
  plan: Plan,
  hits: readonly ProvisionHit[],
): Promise<ProvisionHit[]> {
  if (hits.length === 0) return [];
  const listing = hits
    .map(
      (hit, i) =>
        `[${i}] ${hit.authority.toUpperCase()} · ${hit.title ?? ""} · ${hit.heading}\n${hit.text.slice(0, 160).replace(/\s+/g, " ")}`,
    )
    .join("\n");
  let review: Review | null = null;
  try {
    review = parse(
      (
        await ask({
          messages: [
            { role: "system", content: PROMPT },
            { role: "user", content: `Question: ${plan.question}\n\nFound:\n${listing}` },
          ],
          maxTokens: 500,
        })
      ).text,
    );
  } catch {
    review = null;
  }
  if (!review) return [...hits];
  const kept = review.relevant.filter((i) => i >= 0 && i < hits.length).map((i) => hits[i]!);
  const seen = new Set(kept.map(idOf));
  const extra: ProvisionHit[] = [];
  for (const search of review.missing) {
    for (const authority of search.authorities) {
      for (const hit of await searchProvisions(db, {
        groups: search.groups,
        authority,
        limit: 5,
      })) {
        if (seen.has(idOf(hit))) continue;
        seen.add(idOf(hit));
        extra.push(hit);
      }
    }
  }
  // Nothing judged relevant and nothing new: the first results are all there is.
  if (kept.length === 0 && extra.length === 0) return [...hits];
  return [...extra, ...kept].slice(0, MAX_KEPT);
}
