"use client";

import { useState } from "react";
import { registrationMessage } from "@/lib/bitcoin/message";

interface Verdict {
  registered: boolean;
  verified: boolean;
  reason?: string;
}

/**
 * Claiming a seat is deliberately the same shape as casting a vote: paste an
 * address, sign the exact text shown, paste the signature. Solon never sees a
 * private key and there is no wallet-connect step to fail — the same three
 * fields work in Sparrow, Electrum and Bitcoin Core.
 */
export default function ClaimSeat({
  orgSlug,
  actorId,
  defaultName,
}: {
  orgSlug: string;
  actorId: string;
  defaultName: string;
}) {
  const [displayName, setDisplayName] = useState(defaultName);
  const [address, setAddress] = useState("");
  const [signature, setSignature] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [copied, setCopied] = useState(false);

  const message = address
    ? registrationMessage({ orgSlug, actorId, memberAddress: address })
    : null;

  async function submit() {
    setSubmitting(true);
    setVerdict(null);
    try {
      const res = await fetch("/api/members/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgSlug, displayName, address, signature }),
      });
      const body = (await res.json()) as Verdict;
      setVerdict(body);
      if (body.registered) window.location.reload();
    } catch {
      setVerdict({
        registered: false,
        verified: false,
        reason: "network error — nothing was submitted",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5 rounded-surface border border-default bg-surface-base p-6">
      <div>
        <label className="block text-sm font-medium text-fg-primary" htmlFor="join-name">
          Display name on the roster
        </label>
        <input
          id="join-name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="mt-1 w-full rounded-control border border-default bg-surface-raised px-3 py-2 text-sm text-fg-primary"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-fg-primary" htmlFor="join-address">
          Your Bitcoin address
        </label>
        <input
          id="join-address"
          value={address}
          onChange={(e) => setAddress(e.target.value.trim())}
          placeholder="bc1… or 1…"
          className="mt-1 w-full rounded-control border border-default bg-surface-raised px-3 py-2 font-mono text-sm text-fg-primary"
        />
        <p className="mt-1.5 text-xs text-fg-tertiary">
          This becomes your voting credential. Every vote you cast must recover
          to it, so use a key you control and can sign with again.
        </p>
      </div>

      {message && (
        <div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-medium text-fg-primary">
              Sign exactly this text with that address
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
        <label className="block text-sm font-medium text-fg-primary" htmlFor="join-signature">
          Signature
        </label>
        <textarea
          id="join-signature"
          value={signature}
          onChange={(e) => setSignature(e.target.value.trim())}
          rows={3}
          placeholder="Paste the base64 signature from your wallet's Sign Message tool"
          className="mt-1 w-full rounded-control border border-default bg-surface-raised px-3 py-2 font-mono text-xs text-fg-primary"
        />
      </div>

      <button
        type="button"
        disabled={submitting || !address || !signature || displayName.trim().length < 2}
        onClick={submit}
        className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Verifying signature…" : "Claim the founding seat"}
      </button>

      {verdict && !verdict.registered && (
        <p className="rounded-control border border-status-negative/40 bg-surface-raised p-3 text-sm text-fg-primary">
          {verdict.reason ?? "Registration failed."}
        </p>
      )}
    </div>
  );
}
