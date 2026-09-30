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
      else setError(body.error ?? "The vote could not be started.");
    } catch {
      setError("The connection dropped, so the vote did not start. Please try again.");
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
        {submitting ? "Starting…" : "Start the vote"}
      </button>
      <p className="mt-2 text-xs text-fg-tertiary">
        Members can vote from then on, and the rules for this vote are fixed. You cannot undo this.
      </p>
      {error && (
        <p className="mt-3 rounded-control border border-status-negative/40 bg-surface-raised p-3 text-sm text-fg-primary">
          {error}
        </p>
      )}
    </div>
  );
}
