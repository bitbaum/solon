"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { proposalMessage } from "@/lib/bitcoin/message";
import { canonicalJson, sha256Hex } from "@/lib/domain/canonical";
import { ALL_METHODS, methodSpec } from "@/lib/domain/methods";
import { optionsSchema } from "@/lib/domain/methods/types";
import MethodPicker from "./method-picker";

interface Verdict {
  created: boolean;
  verified: boolean;
  reason?: string;
  proposalId?: string;
}

/**
 * Categories a member can file from the UI. Policy changes are deliberately
 * absent: they must carry an exact JSON body whose sha256 is bound into the
 * signature, and a free-text box would invite signing content that does not
 * parse. Those go through the API, where the content is explicit.
 */
const CATEGORIES = [
  { value: "OPERATIONS", label: "Operations", hint: "Day-to-day decisions. All members vote." },
  { value: "MEMBERSHIP", label: "Membership", hint: "Admit or remove a member. Humans only, supermajority." },
  { value: "SAFETY", label: "Safety", hint: "Red lines and limits. Humans only, supermajority." },
  { value: "TREASURY_SPEND", label: "Treasury spend", hint: "Move funds. All members vote." },
  { value: "AID_DISBURSEMENT", label: "Aid disbursement", hint: "Money to people. Humans only." },
  { value: "GOVERNANCE_RULES", label: "Governance rules", hint: "Change the rules themselves. Humans only." },
] as const;

export default function FileProposal({
  orgSlug,
  memberAddress,
}: {
  orgSlug: string;
  memberAddress: string;
}) {
  const [category, setCategory] = useState<string>("OPERATIONS");
  const [method, setMethod] = useState<string>("");
  const [optionText, setOptionText] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [signature, setSignature] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [copied, setCopied] = useState(false);

  // The answer space, parsed from one line per option. Kept as text in the UI
  // and validated by the same schema the server uses, so the proposer sees the
  // same rejection the API would give rather than a different opinion.
  const options = useMemo(() => {
    const parsed = optionText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((label) => ({
        key: label
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 32),
        label,
      }));
    const result = optionsSchema.safeParse(parsed);
    return result.success ? result.data : null;
  }, [optionText]);

  const spec = method ? methodSpec(method as Parameters<typeof methodSpec>[0]) : null;
  const needsOptions = spec?.needsOptions ?? false;
  const optionsReady = !needsOptions || options !== null;

  const ready = title.trim().length >= 3 && body.trim().length > 0 && optionsReady;
  const message = ready
    ? proposalMessage({
        orgSlug,
        category,
        title: title.trim(),
        proposerAddress: memberAddress,
        // Bound in only when there is an answer space, so a yes/no proposal
        // signs exactly the text it always did.
        optionsHash: needsOptions && options ? sha256Hex(canonicalJson(options)) : null,
      })
    : null;

  async function submit() {
    setSubmitting(true);
    setVerdict(null);
    try {
      const res = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgSlug,
          category,
          title: title.trim(),
          body: body.trim(),
          ...(method ? { method } : {}),
          ...(needsOptions && options ? { options } : {}),
          proposerAddress: memberAddress,
          signature,
        }),
      });
      setVerdict((await res.json()) as Verdict);
    } catch {
      setVerdict({
        created: false,
        verified: false,
        reason: "network error — nothing was filed",
      });
    } finally {
      setSubmitting(false);
    }
  }

  const active = CATEGORIES.find((c) => c.value === category);

  if (verdict?.created) {
    return (
      <div className="rounded-surface border border-default bg-surface-base p-6">
        <h2 className="font-display text-display-3 text-fg-primary">Proposal filed</h2>
        <p className="mt-3 text-sm text-fg-secondary">
          Your signature verified and the proposal is on the record as a draft.
          Opening it starts the voting window and freezes the rules.
        </p>
        <div className="mt-6 flex flex-wrap gap-4">
          <Link href={`/proposals/${verdict.proposalId}`} className="btn-primary">
            Open it for voting
          </Link>
          <Link
            href="/proposals"
            className="self-center text-sm text-fg-secondary transition-colors hover:text-fg-primary"
          >
            All proposals →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 rounded-surface border border-default bg-surface-base p-6">
      <div>
        <label className="block text-sm font-medium text-fg-primary" htmlFor="p-category">
          Category
        </label>
        <select
          id="p-category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="mt-1 w-full rounded-control border border-default bg-surface-raised px-3 py-2 text-sm text-fg-primary"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        {active && <p className="mt-1.5 text-xs text-fg-tertiary">{active.hint}</p>}
      </div>

      <div>
        <MethodPicker
          methods={ALL_METHODS}
          value={method}
          onChange={(m) => setMethod(m)}
        />
        {needsOptions && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-fg-primary" htmlFor="p-options">
              The options — one per line
            </label>
            <textarea
              id="p-options"
              rows={4}
              value={optionText}
              onChange={(e) => setOptionText(e.target.value)}
              placeholder={"Solar roof\nHeat pump\nInsulation"}
              className="mt-1 w-full rounded-control border border-default bg-surface-raised px-3 py-2 text-sm text-fg-primary"
            />
            {options ? (
              <p className="mt-1.5 text-xs text-fg-tertiary">
                Members will vote between: {options.map((o) => o.key).join(", ")}
              </p>
            ) : (
              <p className="mt-1.5 text-xs text-fg-tertiary">
                At least two options, each on its own line.
              </p>
            )}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-fg-primary" htmlFor="p-title">
          Title
        </label>
        <input
          id="p-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What is being decided"
          className="mt-1 w-full rounded-control border border-default bg-surface-raised px-3 py-2 text-sm text-fg-primary"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-fg-primary" htmlFor="p-body">
          Rationale
        </label>
        <textarea
          id="p-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={6}
          placeholder="Why this, and what changes if it passes."
          className="mt-1 w-full rounded-control border border-default bg-surface-raised px-3 py-2 text-sm text-fg-primary"
        />
        <p className="mt-1.5 text-xs text-fg-tertiary">
          The title and category are bound into your signature; the rationale is
          not, so it stays editable context rather than a signed claim.
        </p>
      </div>

      {message && (
        <div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-medium text-fg-primary">
              Sign exactly this text with {memberAddress.slice(0, 10)}…
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
        <label className="block text-sm font-medium text-fg-primary" htmlFor="p-sig">
          Signature
        </label>
        <textarea
          id="p-sig"
          value={signature}
          onChange={(e) => setSignature(e.target.value.trim())}
          rows={3}
          className="mt-1 w-full rounded-control border border-default bg-surface-raised px-3 py-2 font-mono text-xs text-fg-primary"
        />
      </div>

      <button
        type="button"
        disabled={submitting || !ready || !signature}
        onClick={submit}
        className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Verifying signature…" : "File proposal"}
      </button>

      {verdict && !verdict.created && (
        <p className="rounded-control border border-status-negative/40 bg-surface-raised p-3 text-sm text-fg-primary">
          {verdict.reason ?? "Proposal rejected."}
        </p>
      )}
    </div>
  );
}
