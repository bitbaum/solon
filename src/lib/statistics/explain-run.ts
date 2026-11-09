/**
 * Asks for an explanation, checks it (explain.ts), and asks once more with the
 * problems named if it fails. What still fails is dropped, never shown: the
 * caller falls back to the page's plain-words facts.
 */
import type { ChatMessage } from "@bitbaum/ai-kit";
import type { BriefFact } from "./brief";
import { checkExplanation, explainMessages } from "./explain";

export type Ask = (messages: ChatMessage[]) => Promise<{ text: string; model?: string }>;

export type Explained =
  | { ok: true; text: string; cited: string[]; model: string | null; attempts: number }
  | { ok: false; problems: string[]; attempts: number };

export async function explain(
  facts: readonly BriefFact[],
  options: { language: string; question?: string; ask: Ask },
): Promise<Explained> {
  let problems: string[] = [];
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const reply = await options.ask(
      explainMessages(facts, options.language, options.question, problems),
    );
    const text = reply.text.trim();
    const check = text ? checkExplanation(text, facts) : null;
    if (check?.ok) {
      return { ok: true, text, cited: check.cited, model: reply.model ?? null, attempts: attempt };
    }
    problems = check?.problems ?? ["it was empty"];
  }
  return { ok: false, problems, attempts: 2 };
}
