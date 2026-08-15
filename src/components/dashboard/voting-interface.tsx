"use client";

import { useState } from "react";
import { voteMessage } from "@/lib/bitcoin/message";

type Choice = "yes" | "no" | "abstain";
const CHOICES: Choice[] = ["yes", "no", "abstain"];

export interface VotingInterfaceProps {
  session: { id: string; title: string; rules: string; status: string };
  tally: Record<Choice, number>;
}

interface VoteVerdict {
  stored: boolean;
  verified: boolean;
  reason?: string;
  tally?: Record<Choice, number>;
}

/**
 * Casting a vote requires a real Bitcoin signed-message signature: the member
 * signs the canonical vote message with their own wallet (Sparrow, Electrum,
 * Bitcoin Core `signmessage`) and pastes the signature here. The server
 * verifies it; nothing is stored on failure and the verdict is shown as-is.
 */
export default function VotingInterface({
  session,
  tally,
}: VotingInterfaceProps) {
  const [choice, setChoice] = useState<Choice>("yes");
  const [address, setAddress] = useState("");
  const [signature, setSignature] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [verdict, setVerdict] = useState<VoteVerdict | null>(null);
  const [copied, setCopied] = useState(false);

  const isOpen = session.status === "ACTIVE";

  const message = address
    ? voteMessage({ sessionId: session.id, choice, memberAddress: address })
    : null;

  const liveTally = verdict?.tally ?? tally;

  async function submit() {
    setSubmitting(true);
    setVerdict(null);
    try {
      const res = await fetch(`/api/sessions/${session.id}/votes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choice, address, signature }),
      });
      setVerdict(await res.json());
    } catch {
      setVerdict({
        stored: false,
        verified: false,
        reason: "network error — vote not submitted",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-display-3 text-fg-primary">{session.title}</h2>
          <p className="text-sm text-fg-secondary">{session.rules}</p>
        </div>
        <div className="text-right text-sm text-fg-secondary">
          Session: {session.status}
        </div>
      </header>

      {!isOpen && (
        <div className="rounded-surface border border-default p-4 bg-surface-raised text-sm text-fg-primary">
          This session is closed — votes are no longer accepted. The final tally
          is below, and the full signed record is published as a{" "}
          <a
            href={`/api/v1/decisions/${session.id}`}
            className="font-semibold text-accent hover:text-accent-dark"
          >
            self-verifying decision document
          </a>
          .
        </div>
      )}

      {isOpen && (
        <div className="rounded-surface border border-default p-4 bg-surface-raised space-y-4">
          <div>
            <label
              className="block text-sm font-medium text-fg-primary"
              htmlFor="vote-address"
            >
              Your Bitcoin address (registered member)
            </label>
            <input
              id="vote-address"
              value={address}
              onChange={(e) => setAddress(e.target.value.trim())}
              placeholder="1..."
              className="mt-1 w-full px-3 py-2 rounded-control border border-default font-mono text-sm"
            />
          </div>

          <div>
            <span className="block text-sm font-medium text-fg-primary">
              Your choice
            </span>
            <div className="mt-1 flex gap-3">
              {CHOICES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setChoice(c)}
                  className={`px-4 py-2 rounded-control border transition-colors ${
                    choice === c
                      ? "border-default bg-surface-raised text-fg-primary"
                      : "border-default bg-surface-base text-fg-primary hover:bg-surface-raised"
                  }`}
                >
                  {c.toUpperCase()}
                </button>
              ))}
            </div>
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
            <label
              className="block text-sm font-medium text-fg-primary"
              htmlFor="vote-signature"
            >
              Signature (base64, from your wallet&apos;s Sign Message tool)
            </label>
            <textarea
              id="vote-signature"
              value={signature}
              onChange={(e) => setSignature(e.target.value.trim())}
              rows={3}
              className="mt-1 w-full px-3 py-2 rounded-control border border-default font-mono text-xs"
            />
          </div>

          <button
            type="button"
            disabled={submitting || !address || !signature}
            onClick={submit}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Verifying signature…" : "Submit signed vote"}
          </button>

          {verdict && (
            <div
              className={`rounded-control p-3 text-sm ${
                verdict.stored
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {verdict.stored
                ? "Vote verified and recorded."
                : `Vote rejected: ${verdict.reason ?? "signature did not verify"}`}
            </div>
          )}
        </div>
      )}

      <div className="rounded-surface border border-default p-4 bg-surface-raised">
        <h3 className="font-semibold text-fg-primary">Tally (weighted)</h3>
        <div className="mt-2 grid grid-cols-3 gap-4 text-center">
          <Tally label="YES" value={liveTally.yes} color="text-green-600" />
          <Tally label="NO" value={liveTally.no} color="text-red-600" />
          <Tally
            label="ABSTAIN"
            value={liveTally.abstain}
            color="text-amber-600"
          />
        </div>
      </div>
    </section>
  );
}

function Tally({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-fg-secondary">{label}</div>
    </div>
  );
}
