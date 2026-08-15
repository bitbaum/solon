"use client";

import { useMemo, useState } from "react";
import { voteMessage } from "@/lib/bitcoin/message";
import { canonicalBallot, methodSpec, parseBallot } from "@/lib/domain/methods";
import { summarizeAggregate } from "@/lib/domain/methods/summary";
import type { Aggregate, BallotOption, MethodId } from "@/lib/domain/methods/types";
import BallotEditor from "./ballot-editor";

export interface VotingInterfaceProps {
  session: {
    id: string;
    title: string;
    rules: string;
    status: string;
    method: MethodId;
    options: BallotOption[];
    dotBudget: number;
  };
  aggregate: Aggregate | null;
}

interface VoteVerdict {
  stored: boolean;
  verified: boolean;
  reason?: string;
  aggregate?: Aggregate;
}

/** The ballot a method starts on, so the form is never in an invalid state. */
function emptyBallot(method: MethodId): unknown {
  switch (method) {
    case "single_choice":
      return { method, choice: "yes" };
    case "consent":
      return { method, response: "agree" };
    case "approval":
      return { method, approved: [] };
    case "dot":
      return { method, allocations: {} };
    case "score":
      return { method, scores: {} };
    case "ranked":
      return { method, ranking: [] };
  }
}

/**
 * Casting a vote requires a real Bitcoin signed-message signature: the member
 * signs the canonical vote message with their own wallet (Sparrow, Electrum,
 * Bitcoin Core `signmessage`) and pastes the signature here. The server
 * verifies it; nothing is stored on failure and the verdict is shown as-is.
 *
 * The message shown is built by the same `canonicalBallot` the server verifies
 * against, so "sign exactly this" is a guarantee rather than a hope — and
 * because option keys are readable slugs, a voter can check that the text they
 * are signing says what they think it says.
 */
export default function VotingInterface({ session, aggregate }: VotingInterfaceProps) {
  const spec = methodSpec(session.method);
  const [ballot, setBallot] = useState<unknown>(() => emptyBallot(session.method));
  const [address, setAddress] = useState("");
  const [signature, setSignature] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [verdict, setVerdict] = useState<VoteVerdict | null>(null);
  const [copied, setCopied] = useState(false);

  const isOpen = session.status === "ACTIVE";

  // A ballot only earns a message once it is actually valid for this method —
  // showing text to sign for a half-filled ballot would invite signing it.
  const { message, invalid } = useMemo(() => {
    const parsed = parseBallot(session.method, ballot, session.options, {
      dotBudget: session.dotBudget,
    });
    if (!parsed.ok) return { message: null, invalid: parsed.error };
    if (!address) return { message: null, invalid: null };
    const canonical = canonicalBallot(session.method, parsed.ballot, {
      dotBudget: session.dotBudget,
    });
    return {
      message: voteMessage({ sessionId: session.id, choice: canonical, memberAddress: address }),
      invalid: null,
    };
  }, [ballot, address, session.id, session.method, session.options, session.dotBudget]);

  const liveAggregate = verdict?.aggregate ?? aggregate;

  async function submit() {
    setSubmitting(true);
    setVerdict(null);
    try {
      const res = await fetch(`/api/sessions/${session.id}/votes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ballot, address, signature }),
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
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-display-3 text-fg-primary">{session.title}</h2>
          <p className="text-sm text-fg-secondary">{session.rules}</p>
        </div>
        <div className="text-right text-sm text-fg-secondary shrink-0">Session: {session.status}</div>
      </header>

      <div className="rounded-surface border border-default p-4 bg-surface-raised">
        <h3 className="font-semibold text-fg-primary">{spec.label}</h3>
        <p className="mt-1 text-sm text-fg-secondary">{spec.summary}</p>
      </div>

      {!isOpen && (
        <div className="rounded-surface border border-default p-4 bg-surface-raised text-sm text-fg-primary">
          This session is closed — votes are no longer accepted. The final result
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
            <label className="block text-sm font-medium text-fg-primary" htmlFor="vote-address">
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

          <BallotEditor
            method={session.method}
            options={session.options}
            dotBudget={session.dotBudget}
            ballot={ballot}
            onChange={setBallot}
          />

          {invalid && <p className="text-sm text-fg-secondary">{invalid}</p>}

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
            <label className="block text-sm font-medium text-fg-primary" htmlFor="vote-signature">
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
            disabled={submitting || !address || !signature || !message}
            onClick={submit}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Verifying signature…" : "Submit signed vote"}
          </button>

          {verdict && (
            <div
              className={`rounded-control p-3 text-sm border ${
                verdict.stored
                  ? "bg-green-50 text-green-800 border-green-200"
                  : "bg-red-50 text-red-800 border-red-200"
              }`}
            >
              {verdict.stored
                ? "Vote verified and recorded."
                : `Vote rejected: ${verdict.reason ?? "signature did not verify"}`}
            </div>
          )}
        </div>
      )}

      <Result aggregate={liveAggregate} />
    </section>
  );
}

function Result({ aggregate }: { aggregate: Aggregate | null }) {
  return (
    <div className="rounded-surface border border-default p-4 bg-surface-raised">
      <h3 className="font-semibold text-fg-primary">Result so far (weighted)</h3>
      <p className="mt-1 text-sm text-fg-secondary">{summarizeAggregate(aggregate)}</p>

      {aggregate?.ranked && aggregate.ranked.length > 0 && (
        <ol className="mt-3 space-y-2">
          {aggregate.ranked.map((r, i) => (
            <li key={r.key}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="text-fg-primary">
                  {i + 1}. {r.label}
                  {aggregate.condorcetKey === r.key && i !== 0 && (
                    <span className="ml-2 text-xs text-fg-secondary">
                      beats every option head-to-head
                    </span>
                  )}
                </span>
                <span className="font-mono text-fg-secondary">
                  {r.score} · {r.percent}%
                </span>
              </div>
              <div className="mt-1 h-1 w-full bg-surface-base border border-default">
                <div className="h-full bg-accent" style={{ width: `${Math.min(100, r.percent)}%` }} />
              </div>
            </li>
          ))}
        </ol>
      )}

      {aggregate?.decisive && (
        <div className="mt-3 grid grid-cols-3 gap-4 text-center">
          <Count label={aggregate.method === "consent" ? "AGREE" : "YES"} value={aggregate.decisive.for} />
          <Count
            label={aggregate.method === "consent" ? "OBJECT" : "NO"}
            value={aggregate.decisive.against}
          />
          <Count label="ABSTAIN" value={aggregate.decisive.abstain} />
        </div>
      )}

      {aggregate?.objections && aggregate.objections.length > 0 && (
        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-semibold text-fg-primary">
            Objections to resolve before this can pass
          </h4>
          {aggregate.objections.map((o, i) => (
            <p
              key={i}
              className="text-sm text-fg-secondary rounded-control border border-default bg-surface-base p-3"
            >
              {o.rationale ?? "(no reason given)"}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-xl font-semibold text-fg-primary">{value}</div>
      <div className="text-xs text-fg-secondary">{label}</div>
    </div>
  );
}
