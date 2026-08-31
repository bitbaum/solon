"use client";

import { useState } from "react";

/**
 * Opening is permissionless by design (the proposal is already signed and
 * public; opening only starts the clock) but it is irreversible and can happen
 * exactly once, so the button says what it will do before it does it.
 */
export default function OpenSessionButton({ proposalId }: { proposalId: string }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function open() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/proposals/${proposalId}/open`, { method: "POST" });
      const body = await res.json();
      if (body.opened) window.location.reload();
      else setError(body.error ?? "could not open the session");
    } catch {
      setError("network error — the session was not opened");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={open}
        disabled={submitting}
        className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Opening…" : "Open for voting"}
      </button>
      <p className="mt-2 text-xs text-fg-tertiary">
        Starts the voting window and freezes the electorate, threshold and quorum. This happens once
        and cannot be undone.
      </p>
      {error && (
        <p className="mt-3 rounded-control border border-status-negative/40 bg-surface-raised p-3 text-sm text-fg-primary">
          {error}
        </p>
      )}
    </div>
  );
}
