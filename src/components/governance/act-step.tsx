"use client";

import { useState, type ReactNode } from "react";

/**
 * The tail every act shares — claiming a seat, founding, filing, voting.
 *
 * The one-click button comes first and is all most people will ever use: the
 * member is signed in, so pressing it is the act. Signing with a Bitcoin key is
 * folded underneath as the optional stronger path, for members who want an act
 * anyone can re-verify without trusting Solon. Renders as siblings of the
 * caller's fields — no wrapper, so the parent's spacing applies unchanged.
 */
export default function ActStep({
  label,
  onAct,
  disabled,
  submitting,
  rejection,
  signing,
}: {
  /** What the one-click button says — the act itself ("Vote", "File proposal"). */
  label: string;
  /** The one-click act. Omitted when the viewer holds no seat to act from. */
  onAct?: () => void;
  /** Anything that blocks the act (an incomplete form). */
  disabled: boolean;
  submitting: boolean;
  /** The server's reason when it refused, or null. */
  rejection: string | null;
  /** The optional signed path; omitted where the member has no key to sign with. */
  signing?: {
    /** Fields the signed path needs first, e.g. an address input. */
    fields?: ReactNode;
    /** The exact text to sign, or null while it cannot be built yet. */
    message: string | null;
    /** Completes "Sign exactly this text with …". */
    hint: ReactNode;
    signature: string;
    onSignatureChange: (signature: string) => void;
    onSubmitSigned: () => void;
  };
}) {
  const [copied, setCopied] = useState(false);

  return (
    <>
      {onAct && (
        <button
          type="button"
          disabled={submitting || disabled}
          onClick={onAct}
          className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Working…" : label}
        </button>
      )}

      {rejection && (
        <p className="rounded-control border border-status-negative/40 bg-surface-raised p-3 text-sm text-fg-primary">
          {rejection}
        </p>
      )}

      {signing && (
        // Always folded: even with no one-click path (signed out), the obvious
        // next step is signing in, not a wallet.
        <details className="rounded-control border border-default bg-surface-raised p-4 text-sm">
          <summary className="cursor-pointer text-fg-secondary">
            {onAct
              ? "Optional: sign with a Bitcoin key instead"
              : "Sign with a registered Bitcoin key"}
          </summary>
          <div className="mt-4 space-y-4">
            <p className="text-xs text-fg-tertiary">
              A one-click act is Solon&apos;s record of what you did while signed in. A signed act
              can be re-verified by anyone, without trusting Solon. Both count the same.
            </p>
            {signing.fields}
            {signing.message && (
              <div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-medium text-fg-primary">
                    Sign exactly this text with {signing.hint}
                  </span>
                  <button
                    type="button"
                    className="text-xs text-accent underline"
                    onClick={async () => {
                      await navigator.clipboard.writeText(signing.message ?? "");
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                  >
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <pre className="mt-1 whitespace-pre-wrap break-all rounded-control border border-default bg-surface-base p-3 font-mono text-xs text-fg-primary">
                  {signing.message}
                </pre>
              </div>
            )}
            <textarea
              aria-label="Signature"
              value={signing.signature}
              onChange={(e) => signing.onSignatureChange(e.target.value.trim())}
              rows={3}
              placeholder="Paste the base64 signature from your wallet's Sign Message tool"
              className="w-full rounded-control border border-default bg-surface-base px-3 py-2 font-mono text-xs text-fg-primary"
            />
            <button
              type="button"
              disabled={submitting || disabled || !signing.message || !signing.signature}
              onClick={signing.onSubmitSigned}
              className="btn-secondary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Verifying signature…" : `${label} with signature`}
            </button>
          </div>
        </details>
      )}
    </>
  );
}
