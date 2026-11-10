"use client";

import { readEventStream } from "@bitbaum/ai-kit/sse";
import { useRef, useState } from "react";
import type { ResearchEvent } from "@/lib/statistics/research-events";

export interface ResearchTexts {
  questionLabel: string;
  placeholder: string;
  ask: string;
  asking: string;
  steps: { search: string; write: string };
  tools: Record<string, string>;
  sourcesTitle: string;
  reportTitle: string;
  aiLabel: string;
  cited: string;
  rateLimited: string;
  unavailable: string;
  failed: string;
  examples: string[];
  examplesTitle: string;
}

type Source = { id: string; text: string; href?: string };

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
            <a href={`#source-${id.trim()}`} className="underline">
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
 * Deep research on a question: it shows what the tools are reading as it goes,
 * lists every source found, and shows the report only if it passed the check
 * against those sources.
 */
export default function ResearchView({ locale, texts }: { locale: string; texts: ResearchTexts }) {
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<"search" | "write" | null>(null);
  const [activity, setActivity] = useState<{ tool: string; detail: string }[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [report, setReport] = useState<{
    text: string;
    cited: string[];
    model: string | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  async function run(q: string) {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setBusy(true);
    setStep("search");
    setActivity([]);
    setSources([]);
    setReport(null);
    setError(null);
    try {
      const res = await fetch("/api/v1/statistics/research", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: q, locale }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        setError(
          res.status === 429
            ? texts.rateLimited
            : res.status === 503
              ? texts.unavailable
              : texts.failed,
        );
        return;
      }
      await readEventStream<ResearchEvent>(res.body, (e) => {
        if (e.type === "step") setStep(e.step);
        else if (e.type === "activity")
          setActivity((a) => [...a, { tool: e.tool, detail: e.detail }]);
        else if (e.type === "sources") setSources(e.sources);
        else if (e.type === "done") setReport({ text: e.text, cited: e.cited, model: e.model });
        else setError(e.error);
      });
    } catch {
      if (!controller.signal.aborted) setError(texts.failed);
    } finally {
      setBusy(false);
      setStep(null);
    }
  }

  return (
    <div className="max-w-4xl space-y-8">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (question.trim().length >= 8 && !busy) void run(question.trim());
        }}
      >
        <label className="flex flex-col gap-1 text-sm text-fg-secondary">
          {texts.questionLabel}
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder={texts.placeholder}
            className="field w-full"
          />
        </label>
        <button
          type="submit"
          disabled={busy || question.trim().length < 8}
          className="btn-primary min-h-11"
        >
          {busy ? texts.asking : texts.ask}
        </button>
        <div className="space-y-1">
          <p className="mb-0 text-xs text-fg-tertiary">{texts.examplesTitle}</p>
          <ul className="flex flex-wrap gap-2">
            {texts.examples.map((ex) => (
              <li key={ex}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setQuestion(ex);
                    void run(ex);
                  }}
                  className="btn-secondary min-h-11 text-left text-sm"
                >
                  {ex}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </form>

      <div aria-live="polite" className="space-y-6">
        {(busy || activity.length > 0) && (
          <ul className="space-y-1 text-sm text-fg-secondary">
            {activity.map((a, i) => (
              <li key={i} className="wrap-anywhere">
                {texts.tools[a.tool] ?? a.tool}
                {a.detail ? `: ${a.detail}` : ""}
              </li>
            ))}
            {step && <li className="text-fg-tertiary">{texts.steps[step]}…</li>}
          </ul>
        )}
        {error && <p className="mb-0 text-fg-secondary">{error}</p>}
        {report && (
          <section className="space-y-3 rounded-surface border border-default bg-surface-raised p-5">
            <h2 className="text-xl font-semibold text-fg-primary">{texts.reportTitle}</h2>
            {report.text.split(/\n\s*\n/).map((p, i) => (
              <p key={i} className="mb-0 text-fg-primary wrap-anywhere">
                {withLinks(p)}
              </p>
            ))}
            <p className="mb-0 text-xs text-fg-tertiary">
              {texts.aiLabel}
              {report.cited.length > 0 && ` ${texts.cited}: ${report.cited.join(", ")}.`}
              {report.model && ` (${report.model})`}
            </p>
          </section>
        )}
        {sources.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-fg-primary">
              {texts.sourcesTitle} ({sources.length})
            </h2>
            <ol className="space-y-2 text-sm text-fg-secondary">
              {sources.map((s) => (
                <li key={s.id} id={`source-${s.id}`} className="scroll-mt-24 wrap-anywhere">
                  <span className="mr-2 text-fg-tertiary">{s.id}</span>
                  {s.href ? (
                    <a href={s.href} className="underline" rel="noopener">
                      {s.text}
                    </a>
                  ) : (
                    s.text
                  )}
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </div>
  );
}
