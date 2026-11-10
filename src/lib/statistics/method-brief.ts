/**
 * What a method's page says, as numbered facts (see brief.ts), so an AI asked
 * about an index answers from what was read about it and nothing else. The
 * critical questions are facts too: the model may raise them, and must say
 * when the page cannot answer them.
 */
import { localized } from "@/lib/places/place-view";
import type { BriefFact } from "./brief";
import { questionsFor, type Methodology, type QuestionKey } from "./methodologies";

/** English, for the model; the page asks the same questions in the reader's language. */
const QUESTION_EN: Record<QuestionKey, string> = {
  experts: "Who are the experts, how many score each country, and how far do they disagree?",
  composite: "Which sources does it combine, and does any count twice?",
  weights:
    "Are the weights argued for or simply chosen, and does the ranking survive other weights?",
  perception: "Whose perception does it measure?",
  official: "Do the countries count the same way?",
  coded: "Is the scale written down, and would a second reader code the text the same way?",
  layer: "Does it mix what the law says with what happens?",
  inputs: "Its inputs carry their own choices and licences.",
  licence: "Its figures cannot be shown on Solon.",
  unread: "Part of how it works has not been read yet.",
};

export function buildMethodBrief(m: Methodology): BriefFact[] {
  const lines: { text: string; href?: string }[] = [
    {
      text: `${m.name}, published by ${m.publisher}, says it measures: ${localized(m.claims, "en")}`,
      href: m.homepage,
    },
    {
      text: `How it is made: ${m.kinds.join(", ").replaceAll("_", " ")}. What it looks at: ${m.layers.join(", ").replaceAll("_", " ")}.`,
    },
  ];
  if (m.components.length > 0)
    lines.push({ text: `Its parts, as the publisher names them: ${m.components.join("; ")}.` });
  else lines.push({ text: "Its parts have not been read yet." });
  if (m.coverage) lines.push({ text: `Coverage: ${localized(m.coverage, "en")}` });
  if (m.draws_on.length > 0)
    lines.push({ text: `It takes inputs from: ${m.draws_on.join("; ")}.` });
  lines.push({
    text: `Licence: ${m.licence.verdict.replaceAll("_", " ")}. The terms say: "${m.licence.terms}" ${localized(m.licence.why, "en")}`,
  });
  for (const u of m.unread) lines.push({ text: `Not read yet: ${u}.` });
  for (const q of questionsFor(m))
    lines.push({ text: `A question to ask of it: ${QUESTION_EN[q]}` });
  for (const e of m.evidence)
    lines.push({ text: `Source read on ${e.read}: ${e.publisher}.`, href: e.url });
  return lines.map((l, i) => ({
    id: `F${i + 1}`,
    kind: "statement" as const,
    params: { text: l.text },
    ...(l.href ? { href: l.href } : {}),
  }));
}
