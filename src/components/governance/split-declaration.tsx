"use client";

import { useMemo, useState } from "react";
import { allocationMessage } from "@/lib/bitcoin/message";
import {
  TOTAL_PERCENT,
  canonicalSplit,
  evenSplit,
  splitHash,
  splitViolations,
  type ContributionTier,
  type Splits,
} from "@/lib/domain/allocation/policy";

export interface SplitDeclarationProps {
  orgSlug: string;
  tiers: ContributionTier[];
  /** Policy version in force; null when the default bounds apply. */
  policyVersion: number | null;
}

interface Verdict {
  stored: boolean;
  verified: boolean;
  reason?: string;
  violations?: string[];
  version?: number;
}

/**
 * Declare your own contribution split.
 *
 * The message shown is built by the same `canonicalSplit` and `splitHash` the
 * server verifies against, so "sign exactly this" is a guarantee rather than a
 * hope — and because tier keys are readable words, a member can check that the
 * text they are putting their key behind says what they think it says.
 *
 * The form will not produce a message for a split that does not satisfy the
 * bounds. Showing text to sign for an invalid split would be inviting someone
 * to sign it, and the rejection would arrive after the signature rather than
 * before it.
 */
export default function SplitDeclaration({ orgSlug, tiers, policyVersion }: SplitDeclarationProps) {
  const [splits, setSplits] = useState<Splits>(
    () => evenSplit(tiers) ?? Object.fromEntries(tiers.map((t) => [t.key, t.minPercent])),
  );
  const [address, setAddress] = useState("");
  const [signature, setSignature] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [copied, setCopied] = useState(false);

  const total = tiers.reduce((sum, tier) => sum + (splits[tier.key] ?? 0), 0);
  const remaining = TOTAL_PERCENT - total;
  const violations = useMemo(() => splitViolations(splits, tiers), [splits, tiers]);

  const message = useMemo(() => {
    if (violations.length > 0 || !address) return null;
    return allocationMessage({
      orgSlug,
      memberAddress: address,
      policyVersion,
      split: canonicalSplit(splits),
      hash: splitHash(splits),
    });
  }, [violations.length, address, orgSlug, policyVersion, splits]);

  function setTier(key: string, raw: string) {
    const value = Number.parseInt(raw, 10);
    setSplits((prev) => ({ ...prev, [key]: Number.isNaN(value) ? 0 : value }));
    setVerdict(null);
  }

  async function submit() {
    setSubmitting(true);
    setVerdict(null);
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/allocation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, splits, signature }),
      });
      setVerdict(await res.json());
    } catch {
      setVerdict({ stored: false, verified: false, reason: "network error — nothing was recorded" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-surface border border-default bg-surface-raised p-6 space-y-6">
      <div>
        <h2 className="font-display text-display-3 text-fg-primary">Direct your own contribution</h2>
        <p className="mt-2 text-sm text-fg-secondary">
          Set the share of your contribution that goes to each level of government. Nobody can
          set this for you — the only thing that writes it is a signature from your own key.
        </p>
      </div>

      <div className="space-y-5">
        {tiers.map((tier) => {
          const value = splits[tier.key] ?? 0;
          return (
            <div key={tier.key}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <label className="text-sm font-semibold text-fg-primary" htmlFor={`tier-${tier.key}`}>
                  {tier.label}
                </label>
                <span className="font-mono text-sm text-fg-secondary">
                  {tier.minPercent}%–{tier.maxPercent}% allowed
                </span>
              </div>
              {tier.description && (
                <p className="mt-1 text-sm text-fg-secondary">{tier.description}</p>
              )}
              <div className="mt-2 flex items-center gap-4">
                <input
                  id={`tier-${tier.key}`}
                  type="range"
                  min={0}
                  max={TOTAL_PERCENT}
                  value={value}
                  onChange={(e) => setTier(tier.key, e.target.value)}
                  className="flex-1 accent-accent"
                  aria-describedby={`tier-${tier.key}-value`}
                />
                <input
                  type="number"
                  min={0}
                  max={TOTAL_PERCENT}
                  value={value}
                  onChange={(e) => setTier(tier.key, e.target.value)}
                  aria-label={`${tier.label} percent`}
                  className="w-20 px-3 py-2 rounded-control border border-default font-mono text-sm text-right"
                />
                <span id={`tier-${tier.key}-value`} className="w-4 text-sm text-fg-secondary">
                  %
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-baseline justify-between border-t border-subtle pt-4">
        <span className="text-sm text-fg-secondary">Total</span>
        <span className="font-mono text-sm text-fg-primary">
          {total}%{remaining !== 0 && ` · ${remaining > 0 ? `${remaining} left to place` : `${-remaining} over`}`}
        </span>
      </div>

      {violations.length > 0 && (
        <ul className="space-y-1 text-sm text-fg-secondary">
          {violations.map((problem) => (
            <li key={problem}>· {problem}</li>
          ))}
        </ul>
      )}

      <div>
        <label className="block text-sm font-medium text-fg-primary" htmlFor="split-address">
          Your Bitcoin address (registered member)
        </label>
        <input
          id="split-address"
          value={address}
          onChange={(e) => setAddress(e.target.value.trim())}
          placeholder="1..."
          className="mt-1 w-full px-3 py-2 rounded-control border border-default font-mono text-sm"
        />
      </div>

      {message && (
        <div>
          <div className="flex items-center justify-between">
            <span className="block text-sm font-medium text-fg-primary">
              Sign exactly this message with your wallet
            </span>
            <button
              type="button"
              className="text-xs text-fg-primary underline"
              onClick={async () => {
                await navigator.clipboard.writeText(message);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? "Copied" : "Copy message"}
            </button>
          </div>
          <pre className="mt-1 p-3 rounded-control bg-surface-base border border-default text-xs font-mono whitespace-pre-wrap break-all">
            {message}
          </pre>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-fg-primary" htmlFor="split-signature">
          Signature (base64, from your wallet&apos;s Sign Message tool)
        </label>
        <textarea
          id="split-signature"
          value={signature}
          onChange={(e) => setSignature(e.target.value.trim())}
          rows={3}
          className="mt-1 w-full px-3 py-2 rounded-control border border-default font-mono text-xs"
        />
      </div>

      <button
        type="button"
        disabled={submitting || !message || !signature}
        onClick={submit}
        className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? "Verifying signature…" : "Record my split"}
      </button>

      {verdict && (
        <div
          className={`rounded-control p-3 text-sm border ${
            verdict.stored
              ? "bg-green-50 text-green-800 border-green-200"
              : "bg-red-50 text-red-800 border-red-200"
          }`}
        >
          {verdict.stored ? (
            <>
              Recorded as version {verdict.version}. Any split you declared before is kept on the
              record as superseded, not erased.
            </>
          ) : (
            <>
              Not recorded: {verdict.reason ?? "the signature did not verify"}
              {verdict.violations && verdict.violations.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {verdict.violations.map((problem) => (
                    <li key={problem}>· {problem}</li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
