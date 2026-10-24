/**
 * Turns a conversation into a search: the question stood on its own ("and in
 * Lucerne?" after a question about foxes is a question about foxes), the places
 * it is about, and the few words the law itself would use. The law is written
 * in German, French and Italian; the person may ask in English or Russian, so
 * the words are the model's to translate. Places named in the last message are
 * added whatever the model says: a place the person typed is never dropped.
 */
import { complete, type ChatMessage, type CompleteOptions } from "@bitbaum/ai-kit";
import { LAW_AUTHORITIES } from "@/lib/config/law";
import { authoritiesNamed } from "./places";

export interface Plan {
  question: string;
  /** Authority keys to search; the Confederation is always among them. */
  authorities: string[];
  /** Distinctive words as the law words them, flat (the fallback). */
  terms: string[];
  /** The same words as ideas: each a list of alternative stems, the thing asked about first. */
  groups: string[][];
  /** The language to answer in, in English ("English", "German", "Russian"). */
  language: string;
}

export type Turn = { role: "user" | "assistant"; content: string };
export type Completer = (
  options: Pick<CompleteOptions, "messages" | "maxTokens">,
) => Promise<{ text: string }>;

const KEYS = new Set(LAW_AUTHORITIES.map((a) => a.key));

const PROMPT = `You prepare a search of Swiss and Liechtenstein law. Reply with JSON only:
{"question": "...", "language": "...", "authorities": ["..."], "groups": [["..."], ["..."]]}

- question: the user's latest question as one complete question that needs no earlier messages.
- authorities: keys of the places the latest question is about, from: ${LAW_AUTHORITIES.map((a) => `${a.key} (${a.name})`).join(", ")}. Include every place named, and for a comparison with an earlier place include both. Leave out "ch".
- language: the language of the user's latest message, in English ("English", "German", "Russian").
- groups: 2 or 3 ideas the provisions must contain together, each a list of 2 to 4 alternative stems as the LAW would word it, in German (and French or Italian for places that speak them). The first idea is the thing the question is about, its most specific nouns (["Fuchs","Füchse","Wildtier"]); then the act or duty (["Haltung","halten","Bewilligung"]). Stems that match inflections. Never a question word, never a word that fits any law ("Gesetz", "Person").`;

const parse = (text: string): Partial<Plan> | null => {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as Partial<Plan>;
  } catch {
    return null;
  }
};

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];

/** The words of a message that could be in a law, when no model could be asked. */
const fallbackTerms = (text: string): string[] => [
  ...new Set((text.toLowerCase().match(/[\p{L}]{5,}/gu) ?? []).slice(0, 8)),
];

export async function planResearch(turns: readonly Turn[], ask: Completer): Promise<Plan> {
  const last = turns.at(-1)?.content ?? "";
  const messages: ChatMessage[] = [
    { role: "system", content: PROMPT },
    ...turns.slice(-6).map((t) => ({ role: t.role, content: t.content.slice(0, 1500) })),
  ];
  let planned: Partial<Plan> | null = null;
  try {
    planned = parse((await ask({ messages, maxTokens: 400 })).text);
  } catch {
    planned = null;
  }
  const named = authoritiesNamed(last);
  const fromModel = strings(planned?.authorities).filter((key) => KEYS.has(key) && key !== "ch");
  const authorities = ["ch", ...new Set([...fromModel, ...named])];
  const groups = (Array.isArray(planned?.groups) ? planned.groups : [])
    .map((group) => strings(group).slice(0, 6))
    .filter((group) => group.length > 0)
    .slice(0, 4);
  const terms = groups.length ? groups.flat() : fallbackTerms(last);
  return {
    question:
      typeof planned?.question === "string" && planned.question.trim()
        ? planned.question.trim()
        : last,
    authorities,
    terms,
    groups: groups.length ? groups : [terms],
    language:
      typeof planned?.language === "string" && planned.language.trim()
        ? planned.language.trim()
        : "the language of the user's last message",
  };
}
