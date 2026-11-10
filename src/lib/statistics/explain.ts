/**
 * An AI explanation of a statistic's page, kept on a short leash: the model is
 * given only the page's numbered facts (brief.ts), told to cite them and to
 * invent nothing, and what it writes is checked before anyone reads it. Every
 * number must be one the facts contain, every citation one that exists, and no
 * paragraph may go without a citation. An explanation that fails the check is
 * asked for once more with the problems named, and then dropped: the page's
 * plain-words facts are still there. The check is a backstop against invented
 * figures and invented sources, not proof the prose is wise; the page says
 * so, and the facts are one click away.
 */
import type { ChatMessage } from "@bitbaum/ai-kit";
import type { BriefFact } from "./brief";

const QUALITY_NOTES: Record<string, string> = {
  gap: "has years missing in between",
  jump: "has a step much larger than its usual one",
  stale: "has a latest figure that is old",
  provisional: "has figures the publisher marks provisional, estimated or forecast",
  short: "has too few figures to judge steps by",
};

const CAUTIONS: Record<string, string> = {
  non_finite: "a figure that was not a number was left out of the chart",
  implausible: "a figure outside what this measure can be was left out of the chart",
  year_spread: "the places' latest figures are from years more than two apart",
  short_series: "too few figures to call a trend",
  constant_series: "the same value for many years in a row, which may be a filled-in figure",
  few_places: "too few places for a ranking to say much",
  thin_scatter: "too few points to read a pattern",
  scatter_years: "the points are from years more than two apart",
};

/** One fact as the model reads it: plain English, every number as the page shows it. */
export function factText(f: BriefFact): string {
  const p = f.params as Record<string, string | number>;
  switch (f.kind) {
    case "definition":
      return `The measure "${p.metric}": ${p.definition}${p.scope ? ` Scope: ${p.scope}` : ""} Published by ${p.publisher}.`;
    case "latest":
      return `${p.metric ? `${p.metric}${p.layer ? ` (${LAYER_WORDS[String(p.layer)]})` : ""}, ` : ""}${p.place}, ${p.year}: ${p.value}${p.flag ? ` (the publisher marks this figure ${p.flag})` : ""}.`;
    case "change":
      return `${p.place}: ${p.fromValue} in ${p.fromYear}, ${p.toValue} in ${p.toYear}; ${
        p.direction === "same"
          ? "unchanged"
          : `${p.direction} ${p.delta}${p.pp ? " percentage points" : ""}`
      }.`;
    case "rank":
      return `From highest to lowest at each place's latest year: ${p.order}.`;
    case "event":
      return `${p.date}, ${p.place}: ${p.title} (${p.category}).`;
    case "quality":
      return `${p.place}'s series ${QUALITY_NOTES[String(p.note)] ?? String(p.note)}${p.years ? ` (${p.years})` : ""}.`;
    case "coded":
      return `${p.place}, coded on "${p.rubric}": point ${p.value} (${p.label}), confidence ${p.confidence}, ${p.status}. ${p.reading}`;
    case "gap":
      return `${p.place}, ${p.year}: ${p.xName} ${p.x}; ${p.yName} ${p.y}${p.gap ? `; difference ${p.gap}${p.pp ? " percentage points" : ""}` : ""}.`;
    case "empty":
      return `The ${p.layer} layer has no series yet. It would be filled by: ${p.wanted}`;
    case "statement":
      return String(p.text);
    case "caution":
      return `Caution: ${CAUTIONS[String(p.note)] ?? String(p.note)}${p.places ? ` (${p.places})` : ""}${p.years ? ` ${p.years}` : ""}.`;
  }
}

const LAYER_WORDS: Record<string, string> = {
  de_jure: "what the law says",
  de_facto: "what happens in practice",
  outcome: "what results",
};

const LANGUAGES: Record<string, string> = {
  en: "English",
  de: "German",
  fr: "French",
  it: "Italian",
  ru: "Russian",
};

const instructions = (
  language: string,
) => `You help a reader interpret one statistic on a Solon page. You are given numbered facts, each with a handle like [F3]. They are everything you know about this page.

Rules:
- Use only the facts. Never add a figure, a cause, a date, a law or a comparison from memory. If the facts do not answer something the reader asks, say so plainly and say what source on the page would.
- Cite every statement with the handle of the fact it rests on, right after the statement, in square brackets with no spaces inside: "Estonia's rate was 22% in 2025 [F2]." or "[F2,F5]". Use only handles from the list. Every paragraph needs at least one.
- Write every number exactly as it appears in the facts. Do not compute new numbers, round, or convert; if a difference matters, use the one the facts give.
- Say what the measure means in plain words, what the figures show, and how the places compare. When a caution or quality fact applies, say so before anything leans on it. Two things that move together are not shown to cause each other; do not say they are.
- Solon does not label places or people. Never call a place or a person free, unfree, better, worse, good or bad, and never name anyone an enemy of anything. Describe what the figures say and what the law does.
- Short and plain: a few short paragraphs, the reading first. No preamble, no headings.
- Write in ${LANGUAGES[language] ?? "English"}.`;

export function explainMessages(
  facts: readonly BriefFact[],
  language: string,
  question?: string,
  problems?: readonly string[],
): ChatMessage[] {
  const list = facts.map((f) => `[${f.id}] ${factText(f)}`).join("\n");
  const ask = question?.trim()
    ? `The reader asks: ${question.trim()}`
    : "Explain these figures to someone who has not seen them.";
  const fix = problems?.length
    ? `\n\nYour previous answer was refused for these reasons; write it again without them:\n- ${problems.join("\n- ")}`
    : "";
  return [
    { role: "system", content: `${instructions(language)}\n\nFACTS\n${list}` },
    { role: "user", content: `${ask}${fix}` },
  ];
}

/** Every reading a written number may have: "1,234" and "1.234" are a thousand or a decimal by language. */
export function numberReadings(token: string): number[] {
  const clean = token.replace(/[  '’]/g, "");
  const out = new Set<number>();
  const add = (s: string) => {
    const n = Number(s);
    if (Number.isFinite(n)) out.add(n);
  };
  const commas = (clean.match(/,/g) ?? []).length;
  const dots = (clean.match(/\./g) ?? []).length;
  if (commas === 0 && dots === 0) add(clean);
  else if (commas > 0 && dots > 0) {
    const decimal = clean.lastIndexOf(",") > clean.lastIndexOf(".") ? "," : ".";
    const thousands = decimal === "," ? "." : ",";
    add(clean.split(thousands).join("").replace(decimal, "."));
  } else {
    const sep = commas > 0 ? "," : ".";
    add(clean.split(sep).join(""));
    if ((commas || dots) === 1) add(clean.replace(sep, "."));
  }
  return [...out];
}

const NUMBER = /\d[\d  '’.,]*\d|\d/g;

const numbersIn = (text: string): string[] => text.match(NUMBER) ?? [];

/** Words that make a verdict on a place or a person, in the five languages. */
const VERDICTS =
  /\b(enem(?:y|ies)|tyran\w*|evil|Feind\w*|Tyrann\w*|ennemi\w*|nemic\w*|tiran\w*)\b|враг\w*|тиран\w*/iu;

export interface ExplanationCheck {
  ok: boolean;
  problems: string[];
  /** The handles the text cites, in order, once each. */
  cited: string[];
}

/**
 * Whether an explanation stays within its facts: every number one of the facts
 * contains (small whole numbers excepted, as counts and ordinals), every handle
 * one that exists, a handle in every paragraph, no verdict words.
 */
export function checkExplanation(text: string, facts: readonly BriefFact[]): ExplanationCheck {
  const problems: string[] = [];
  const ids = new Set(facts.map((f) => f.id));
  const allowed = new Set<number>();
  for (const f of facts) {
    for (const token of numbersIn(factText(f)))
      for (const n of numberReadings(token)) allowed.add(n);
  }

  const cited: string[] = [];
  const handle = /\[\s*(F\d+(?:\s*,\s*F\d+)*)\s*\]/g;
  for (const m of text.matchAll(handle)) {
    for (const id of m[1]!.split(",").map((s) => s.trim())) {
      if (!ids.has(id)) problems.push(`it cites ${id}, which is not a fact`);
      else if (!cited.includes(id)) cited.push(id);
    }
  }
  if (/\[[^\]]*\bF?\d+[^\]]*\]/.test(text.replace(handle, ""))) {
    problems.push("it has a bracketed reference that is not a fact handle like [F3]");
  }

  const prose = text.replace(handle, " ");
  const unsupported = new Set<string>();
  for (const m of prose.matchAll(NUMBER)) {
    const token = m[0];
    const readings = numberReadings(token);
    const after = prose.slice((m.index ?? 0) + token.length, (m.index ?? 0) + token.length + 2);
    const smallCount = readings.every((n) => Number.isInteger(n) && n >= 0 && n <= 10);
    if (smallCount && !/^\s?%/.test(after)) continue;
    if (!readings.some((n) => allowed.has(n))) unsupported.add(token);
  }
  if (unsupported.size > 0) {
    problems.push(`it states numbers that are in no fact: ${[...unsupported].join(", ")}`);
  }

  for (const paragraph of text.split(/\n\s*\n/).filter((p) => p.trim().length > 80)) {
    if (!handle.test(paragraph)) problems.push("a paragraph cites no fact");
    handle.lastIndex = 0;
  }
  if (cited.length === 0) problems.push("it cites no fact");
  if (VERDICTS.test(prose)) problems.push("it makes a verdict on a place or a person");
  return { ok: problems.length === 0, problems: [...new Set(problems)], cited };
}
