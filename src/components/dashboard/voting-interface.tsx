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
export default function VotingInterface({ session, tally }: VotingInterfaceProps) {
  const [choice, setChoice] = useState<Choice>("yes");
  const [address, setAddress] = useState("");
  const [signature, setSignature] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [verdict, setVerdict] = useState<VoteVerdict | null>(null);
  const [copied, setCopied] = useState(false);

  const message = address
    ? voteMessage({ sessionId: session.id, choice, memberAddress: address })
    : null;

  const liveTally = verdict?.tally ?? tally;

  async function submit() {
    setSubmitting(true);
    setVerdict(null);
    try {
      const res = await fetch(`/api/voting/${session.id}/cryptographic-vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choice, address, signature }),
      });
      setVerdict(await res.json());
    } catch {
      setVerdict({ stored: false, verified: false, reason: "network error — vote not submitted" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--navy)]">{session.title}</h2>
          <p className="text-sm text-gray-600">{session.rules}</p>
        </div>
        <div className="text-right text-sm text-gray-600">Session: {session.status}</div>
      </header>

      <div className="rounded-lg border border-gray-200 p-4 bg-gray-50 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700" htmlFor="vote-address">
            Your Bitcoin address (registered member)
          </label>
          <input
            id="vote-address"
            value={address}
            onChange={(e) => setAddress(e.target.value.trim())}
            placeholder="1..."
            className="mt-1 w-full px-3 py-2 rounded-md border border-gray-300 font-mono text-sm"
          />
        </div>

        <div>
          <span className="block text-sm font-medium text-gray-700">Your choice</span>
          <div className="mt-1 flex gap-3">
            {CHOICES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setChoice(c)}
                className={`px-4 py-2 rounded-md border transition-colors ${
                  choice === c
                    ? "border-[var(--navy)] bg-[var(--navy)] text-white"
                    : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
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
              <span className="block text-sm font-medium text-gray-700">
                Sign exactly this message with your wallet
              </span>
              <button
                type="button"
                className="text-xs text-[var(--navy)] underline"
                onClick={async () => {
                  await navigator.clipboard.writeText(message);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                {copied ? "Copied" : "Copy message"}
              </button>
            </div>
            <pre className="mt-1 p-3 rounded-md bg-white border border-gray-300 text-xs font-mono whitespace-pre-wrap break-all">
              {message}
            </pre>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700" htmlFor="vote-signature">
            Signature (base64, from your wallet&apos;s Sign Message tool)
          </label>
          <textarea
            id="vote-signature"
            value={signature}
            onChange={(e) => setSignature(e.target.value.trim())}
            rows={3}
            className="mt-1 w-full px-3 py-2 rounded-md border border-gray-300 font-mono text-xs"
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
            className={`rounded-md p-3 text-sm ${
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

      <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
        <h3 className="font-semibold text-[var(--navy)]">Tally (weighted)</h3>
        <div className="mt-2 grid grid-cols-3 gap-4 text-center">
          <Tally label="YES" value={liveTally.yes} color="text-green-600" />
          <Tally label="NO" value={liveTally.no} color="text-red-600" />
          <Tally label="ABSTAIN" value={liveTally.abstain} color="text-amber-600" />
        </div>
      </div>
    </section>
  );
}

function Tally({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-600">{label}</div>
    </div>
  );
}
