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
  /** Distinctive words as the law words them. */
  terms: string[];
}

export type Turn = { role: "user" | "assistant"; content: string };
export type Completer = (
  options: Pick<CompleteOptions, "messages" | "maxTokens">,
) => Promise<{ text: string }>;

const KEYS = new Set(LAW_AUTHORITIES.map((a) => a.key));

const PROMPT = `You prepare a search of Swiss and Liechtenstein law. Reply with JSON only:
{"question": "...", "authorities": ["..."], "terms": ["..."]}

- question: the user's latest question as one complete question that needs no earlier messages.
- authorities: keys of the places the latest question is about, from: ${LAW_AUTHORITIES.map((a) => `${a.key} (${a.name})`).join(", ")}. Include every place named, and for a comparison with an earlier place include both. Leave out "ch".
- terms: 4 to 10 single words as the LAW would word them, in German (and French or Italian for places that speak them): the thing, the act, the permit, the duty. Use stems that match inflections (Fuchs, Wildtier, Bewilligung, Haltung, Jagd). No question words.`;

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
  const terms = strings(planned?.terms).slice(0, 12);
  return {
    question:
      typeof planned?.question === "string" && planned.question.trim()
        ? planned.question.trim()
        : last,
    authorities,
    terms: terms.length ? terms : fallbackTerms(last),
  };
}
