"use client";

import { useState, type ReactNode } from "react";

/**
 * The tail every signed action shares: the exact text to sign (with a copy
 * button), a box for the signature, the submit button and the rejection line.
 * Claiming a seat and filing a proposal both end this way, so the markup lives
 * once; what is signed, when the button is armed and what it says are props.
 * Renders as siblings of the caller's fields — no wrapper, so the parent's
 * spacing applies unchanged.
 */
export default function SignatureStep({
  message,
  signHint,
  signatureId,
  signature,
  onSignatureChange,
  placeholder,
  disabled,
  submitting,
  submitLabel,
  onSubmit,
  rejection,
}: {
  /** The exact text the member signs, or null while the form is not ready. */
  message: string | null;
  /** Completes "Sign exactly this text with …". */
  signHint: ReactNode;
  signatureId: string;
  signature: string;
  onSignatureChange: (signature: string) => void;
  placeholder?: string;
  /** Anything beyond "already submitting / no signature" that blocks submit. */
  disabled: boolean;
  submitting: boolean;
  submitLabel: string;
  onSubmit: () => void;
  /** The server's reason when it refused, or null. */
  rejection: string | null;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <>
      {message && (
        <div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-medium text-fg-primary">
              Sign exactly this text with {signHint}
            </span>
            <button
              type="button"
              className="text-xs text-accent underline"
              onClick={async () => {
                await navigator.clipboard.writeText(message);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <pre className="mt-1 whitespace-pre-wrap break-all rounded-control border border-default bg-surface-raised p-3 font-mono text-xs text-fg-primary">
            {message}
          </pre>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-fg-primary" htmlFor={signatureId}>
          Signature
        </label>
        <textarea
          id={signatureId}
          value={signature}
          onChange={(e) => onSignatureChange(e.target.value.trim())}
          rows={3}
          placeholder={placeholder}
          className="mt-1 w-full rounded-control border border-default bg-surface-raised px-3 py-2 font-mono text-xs text-fg-primary"
        />
      </div>

      <button
        type="button"
        disabled={submitting || disabled || !signature}
        onClick={onSubmit}
        className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Verifying signature…" : submitLabel}
      </button>

      {rejection && (
        <p className="rounded-control border border-status-negative/40 bg-surface-raised p-3 text-sm text-fg-primary">
          {rejection}
        </p>
      )}
    </>
  );
}
