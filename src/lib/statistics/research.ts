/**
 * Deep research on a question about governance, statistics or the law: a model
 * with tools reads Solon's own series, dimensions, method descriptions and law,
 * and the open web where a backend is configured, for a few rounds; everything
 * a tool returns becomes a numbered source, and the report is written from
 * those sources alone, then checked like every other explanation
 * (explain.ts): each number must be one a source holds, each citation a source
 * that exists, each paragraph must cite, no verdicts. A report that fails is
 * asked for once more and then dropped; the sources stay, so the reader still
 * has what was found.
 *
 * Pure: the model call and the tools are injected, so the loop is tested with
 * neither (research-tools.ts holds the database-backed tools).
 */
import { safeJsonObject, TEXT_TOOL_PROTOCOL_HINT, type ChatMessage } from "@bitbaum/ai-kit";
import type { BriefFact } from "./brief";
import { checkExplanation } from "./explain";

export interface ResearchSource {
  /** `F1`, `F2` …: what the report cites. */
  id: string;
  text: string;
  href?: string;
}

export interface ToolResult {
  /** What the model reads back about the call. */
  summary: string;
  /** Facts the call found, each of which becomes a numbered source. */
  sources?: { text: string; href?: string }[];
}

export interface ResearchTools {
  specs: unknown[];
  run: (name: string, args: Record<string, unknown>) => Promise<ToolResult>;
}

export interface ToolCall {
  (options: { messages: ChatMessage[]; maxTokens: number; tools: unknown[] }): Promise<{
    text: string;
    toolCalls: { id: string; name: string; args: string }[];
  }>;
}

export const MAX_ROUNDS = 3;
export const MAX_CALLS = 10;
export const MAX_SOURCES = 40;
/** A source longer than this is cut: the report cites sentences, not chapters. */
export const SOURCE_CHARS = 1200;

const LANGUAGES: Record<string, string> = {
  en: "English",
  de: "German",
  fr: "French",
  it: "Italian",
  ru: "Russian",
};

const LOOK = (
  web: boolean,
) => `You research a question about governance, freedom, statistics or the law for a reader, using Solon's tools: its statistical series (with their definitions, scope and data-quality notes), its dimensions (what the law says, what happens, what results, kept apart), its descriptions of how published rankings are made, the law it holds${web ? ", and the open web" : ""}.

Find what bears on the question, from several tools where it helps: a figure and the law behind it, an index and how it is made. Read before you rely: a search only lists what exists. Do not answer yet. When you have enough, or there is nothing more to find, reply with the single word DONE.

${TEXT_TOOL_PROTOCOL_HINT}`;

const WRITE = (
  language: string,
) => `You write a short research report for a reader, from numbered sources only. Each source has a handle like [F3]. They are everything you know about the question.

Rules:
- Use only the sources. Never add a figure, a cause, a date, a law or a comparison from memory. If the sources do not settle the question, say what they do show, what is missing, and which source or tool would answer it.
- Cite every statement with the handle of the source it rests on, in square brackets with no spaces inside: "Estonia's rate was 22% in 2025 [F2]." or "[F2,F5]". Every paragraph needs at least one. Use only handles from the list.
- Write every number exactly as it appears in the sources; do not compute new ones.
- Keep apart what the law says, what happens and what results, and what is only perceived. Say when a figure is provisional, estimated or flagged, and when places are read at different dates. Two things that move together are not shown to cause each other; do not say they are.
- Where several published rankings or sources bear on it, say how each is made and whether they agree. Disagreement is a finding.
- Solon does not label places or people. Never call a place or a person free, unfree, better, worse, good or bad, and never name anyone an enemy of anything.
- Plain and short: what was found first, then what is uncertain, then what to read next. No preamble, no headings.
- Write in ${LANGUAGES[language] ?? "English"}.`;

const clip = (text: string) =>
  text.length > SOURCE_CHARS ? `${text.slice(0, SOURCE_CHARS).trimEnd()} …` : text;

export interface ResearchRun {
  sources: ResearchSource[];
  /** What the model did, in order: tool and arguments. */
  steps: { name: string; args: Record<string, unknown> }[];
}

/** The tool rounds: the model asks, the tools answer, every answer's facts become sources. */
export async function gather(input: {
  question: string;
  call: ToolCall;
  tools: ResearchTools;
  web: boolean;
  onStep?: (name: string, args: Record<string, unknown>) => void;
}): Promise<ResearchRun> {
  const { call, tools } = input;
  const sources: ResearchSource[] = [];
  const steps: ResearchRun["steps"] = [];
  const messages: ChatMessage[] = [
    { role: "system", content: LOOK(input.web) },
    { role: "user", content: `Question: ${input.question}` },
  ];
  let calls = 0;
  for (let round = 0; round < MAX_ROUNDS && calls < MAX_CALLS; round++) {
    let reply: Awaited<ReturnType<ToolCall>>;
    try {
      reply = await call({ messages, maxTokens: 1200, tools: tools.specs });
    } catch {
      break; // no model could call tools: what was found stands
    }
    if (!reply.toolCalls.length) break;
    const results: string[] = [];
    for (const tc of reply.toolCalls.slice(0, MAX_CALLS - calls)) {
      calls++;
      const args = safeJsonObject(tc.args) ?? {};
      steps.push({ name: tc.name, args });
      input.onStep?.(tc.name, args);
      let result: ToolResult;
      try {
        result = await tools.run(tc.name, args);
      } catch (error) {
        result = { summary: `could not run: ${error instanceof Error ? error.message : "failed"}` };
      }
      const added: string[] = [];
      for (const s of result.sources ?? []) {
        if (sources.length >= MAX_SOURCES) break;
        if (sources.some((x) => x.text === s.text)) continue;
        const id = `F${sources.length + 1}`;
        sources.push({ id, text: clip(s.text), ...(s.href ? { href: s.href } : {}) });
        added.push(`[${id}] ${clip(s.text).slice(0, 160)}`);
      }
      results.push(
        `${tc.name}(${JSON.stringify(args)}) → ${result.summary}${added.length ? `\nadded as sources:\n${added.join("\n")}` : ""}`,
      );
    }
    messages.push(
      {
        role: "assistant",
        content: reply.text || reply.toolCalls.map((t) => `TOOL: ${t.name}`).join("\n"),
      },
      {
        role: "user",
        content: `Results:\n\n${results.join("\n\n")}\n\nCall more tools, or reply DONE.`,
      },
    );
  }
  return { sources, steps };
}

export type Report =
  | { ok: true; text: string; cited: string[]; model: string | null; attempts: number }
  | { ok: false; problems: string[]; attempts: number };

export type Write = (messages: ChatMessage[]) => Promise<{ text: string; model?: string }>;

/** The report, from the sources alone, checked; one retry with the problems named. */
export async function writeReport(input: {
  question: string;
  sources: readonly ResearchSource[];
  language: string;
  write: Write;
}): Promise<Report> {
  const facts: BriefFact[] = input.sources.map((s) => ({
    id: s.id,
    kind: "statement",
    params: { text: s.text },
  }));
  const list = input.sources.map((s) => `[${s.id}] ${s.text}`).join("\n");
  let problems: string[] = [];
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const reply = await input.write([
      { role: "system", content: `${WRITE(input.language)}\n\nSOURCES\n${list || "(none found)"}` },
      {
        role: "user",
        content: `Question: ${input.question}${
          problems.length
            ? `\n\nYour previous report was refused for these reasons; write it again without them:\n- ${problems.join("\n- ")}`
            : ""
        }`,
      },
    ]);
    const text = reply.text.trim();
    const check = text ? checkExplanation(text, facts) : null;
    if (check?.ok) {
      return { ok: true, text, cited: check.cited, model: reply.model ?? null, attempts: attempt };
    }
    problems = check?.problems ?? ["it was empty"];
  }
  return { ok: false, problems, attempts: 2 };
}
