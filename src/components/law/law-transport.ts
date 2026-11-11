/**
 * The law chat's one job for chatkit's ChatApp: send a turn to /api/law/ask
 * and stream the answer back, with the steps it took (plan, search, check,
 * write) as the thread's "Thought for" row and the provisions it found as the
 * answer's citations.
 */
import { readEventStream } from "@bitbaum/ai-kit/sse";
import {
  ChatTurnError,
  type ChatMessageData,
  type ChatTransport,
  type ThinkingStep,
} from "@bitbaum/chatkit/react";
import { textAttachmentsOf } from "@/lib/chat/attachments";
import type { LawChatEvent } from "@/lib/chat/events";
import type { Proposal } from "@/lib/law/ask/consult";
import type { AskScope } from "@/lib/law/ask/scope";

type Citations = NonNullable<ChatMessageData["citations"]>;

export interface LawTransportWords {
  step: (step: "plan" | "search" | "check" | "research" | "write") => string;
  /** One line for what the research step did: searched the web, read a page or a provision. */
  activity: (kind: "web" | "read" | "law" | "search", detail: string) => string;
  failed: string;
}

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

export function lawTransport(
  scope: AskScope | undefined,
  words: LawTransportWords,
  /** While drafting a change: the draft as it stands when the turn is sent. */
  proposal?: () => Proposal | null,
): ChatTransport {
  return async (turn) => {
    const messages = [
      ...turn.history
        .filter((m) => !m.failed && (m.role === "user" || m.role === "assistant"))
        .map(({ role, content }) => ({ role, content })),
      { role: "user", content: turn.text },
    ].slice(-20);
    const response = await fetch("/api/law/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages,
        scope,
        proposal: proposal?.() ?? undefined,
        attachments: textAttachmentsOf(turn.attachments),
      }),
      signal: turn.signal,
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      throw new ChatTurnError(data.error || words.failed);
    }
    if (!response.body) throw new ChatTurnError(words.failed);

    const started = Date.now();
    const steps: ThinkingStep[] = [];
    let text = "";
    let answer = "";
    let citations: Citations = {};
    await readEventStream<LawChatEvent>(response.body, (event) => {
      if (event.type === "error") throw new ChatTurnError(event.error || words.failed);
      if (event.type === "step") {
        const label = words.step(event.step);
        steps.push({ label });
        turn.update({ status: label, steps: [...steps], text });
      }
      if (event.type === "activity") {
        const [kind, ...rest] = event.label.split(":");
        const detail = rest.join(":");
        if (kind === "web" || kind === "read" || kind === "law" || kind === "search") {
          steps.push({ label: words.activity(kind, kind === "read" ? hostOf(detail) : detail) });
          turn.update({ status: steps.at(-1)!.label, steps: [...steps], text });
        }
      }
      if (event.type === "sources")
        citations = Object.fromEntries(
          event.sources.map(({ id, label, detail, href }) => [id, { label, detail, href }]),
        );
      if (event.type === "text") {
        text += event.text ?? "";
        turn.update({ text, steps: [...steps] });
      }
      if (event.type === "done") answer = event.text ?? "";
    });
    if (!answer.trim()) throw new ChatTurnError(words.failed);
    return { content: answer, citations, thinking: { durationMs: Date.now() - started, steps } };
  };
}
