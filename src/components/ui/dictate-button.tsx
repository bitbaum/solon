"use client";

import type { DictationProblem } from "@bitbaum/chatkit";
import { useDictation } from "@bitbaum/chatkit/react";

interface DictateButtonProps {
  /** Receives what was said, once, when the take ends. */
  onText: (text: string) => void;
  /** What the button does, read aloud and shown on hover. */
  label: string;
  /** Said while a take is running. */
  stopLabel: string;
  /** What went wrong, in the reader's words: no microphone, nothing heard, no service, too large. */
  problems: Record<DictationProblem, string>;
}

/**
 * The fleet's microphone beside a text box (fleet AGENTS.md, "The experience
 * belongs to the package"): chatkit's `useDictation` does the recording, the
 * fallbacks and the problems; this is only the button. Hidden where neither
 * the browser nor the server can hear, so it is never a dead control.
 */
export default function DictateButton({ onText, label, stopLabel, problems }: DictateButtonProps) {
  const dictation = useDictation({ onText, transcribeUrl: "/api/transcribe" });
  if (!dictation.supported) return null;
  const live = dictation.status !== "idle";
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={dictation.toggle}
        aria-pressed={live}
        aria-label={live ? stopLabel : label}
        title={live ? stopLabel : label}
        className={`inline-flex h-11 w-11 items-center justify-center rounded-control border transition-colors ${
          live
            ? "border-accent text-accent"
            : "border-default text-fg-secondary hover:text-fg-primary"
        }`}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
          {live ? (
            <rect x="7" y="7" width="10" height="10" fill="currentColor" />
          ) : (
            <path
              d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Zm-7 9a7 7 0 0 0 14 0M12 19v3"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          )}
        </svg>
      </button>
      {dictation.problem && (
        <span role="status" className="text-xs text-fg-tertiary">
          {problems[dictation.problem]}
        </span>
      )}
    </span>
  );
}
