"use client";

import { useState } from "react";

export interface ExplainTexts {
  ask: string;
  asking: string;
  again: string;
  questionLabel: string;
  questionPlaceholder: string;
  aiLabel: string;
  cited: string;
  rateLimited: string;
  unavailable: string;
  failed: string;
}

type State =
  | { phase: "idle" }
  | { phase: "asking" }
  | { phase: "done"; text: string; cited: string[]; model: string | null }
  | { phase: "error"; message: string };

/** `[F3]` and `[F3,F5]` in the explanation become links to the facts they rest on. */
function withLinks(paragraph: string): React.ReactNode[] {
  return paragraph.split(/(\[\s*F\d+(?:\s*,\s*F\d+)*\s*\])/g).map((part, i) => {
    const ids = part.match(/^\[\s*(F\d+(?:\s*,\s*F\d+)*)\s*\]$/)?.[1];
    if (!ids) return part;
    return (
      <sup key={i} className="ml-0.5">
        [
        {ids.split(",").map((id, j) => (
          <span key={id}>
            {j > 0 && ","}
            <a href={`#fact-${id.trim()}`} className="underline">
              {id.trim()}
            </a>
          </span>
        ))}
        ]
      </sup>
    );
  });
}

/**
 * Asks for an explanation of the page it sits on. It sends the page's identity
 * (the subject), never its figures: the server reads those itself, so what the
 * model is given cannot be altered from here.
 */
export default function ExplainButton({
  subject,
  locale,
  texts,
}: {
  subject: Record<string, unknown>;
  locale: string;
  texts: ExplainTexts;
}) {
  const [state, setState] = useState<State>({ phase: "idle" });
  const [question, setQuestion] = useState("");

  async function run() {
    setState({ phase: "asking" });
    try {
      const res = await fetch("/api/v1/statistics/explain", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          locale,
          subject,
          ...(question.trim() ? { question: question.trim() } : {}),
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { text: string; cited: string[]; model: string | null };
        setState({ phase: "done", ...data });
        return;
      }
      setState({
        phase: "error",
        message:
          res.status === 429
            ? texts.rateLimited
            : res.status === 502
              ? texts.failed
              : texts.unavailable,
      });
    } catch {
      setState({ phase: "error", message: texts.unavailable });
    }
  }

  const busy = state.phase === "asking";
  return (
    <div className="space-y-3">
      <label className="flex flex-col gap-1 text-sm text-fg-secondary">
        {texts.questionLabel}
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={300}
          placeholder={texts.questionPlaceholder}
          className="field w-full"
        />
      </label>
      <button type="button" onClick={run} disabled={busy} className="btn-secondary min-h-11">
        {busy ? texts.asking : state.phase === "done" ? texts.again : texts.ask}
      </button>
      <div aria-live="polite" className="space-y-3">
        {state.phase === "error" && (
          <p className="mb-0 text-sm text-fg-secondary">{state.message}</p>
        )}
        {state.phase === "done" && (
          <div className="space-y-3 rounded-surface border border-default bg-surface-raised p-4">
            {state.text.split(/\n\s*\n/).map((paragraph, i) => (
              <p key={i} className="mb-0 text-fg-primary wrap-anywhere">
                {withLinks(paragraph)}
              </p>
            ))}
            <p className="mb-0 text-xs text-fg-tertiary">
              {texts.aiLabel}
              {state.cited.length > 0 && ` ${texts.cited}: ${state.cited.join(", ")}.`}
              {state.model && ` (${state.model})`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
