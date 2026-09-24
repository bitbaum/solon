"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { proposalMessage } from "@/lib/bitcoin/message";
import { canonicalJson, sha256Hex } from "@/lib/domain/canonical";
import { ALL_METHODS, methodSpec } from "@/lib/domain/methods";
import { optionsSchema } from "@/lib/domain/methods/types";
import { CATEGORY_LABEL } from "@/lib/config/governance";
import {
  DEFAULT_CATEGORY,
  FILEABLE_CATEGORIES,
  categoryConsequence,
  type ProposalDraft,
} from "@/lib/domain/proposal-draft";
import MethodPicker from "./method-picker";
import ActStep from "./act-step";

interface Verdict {
  created: boolean;
  verified: boolean;
  reason?: string;
  proposalId?: string;
}

// Which categories can be filed here, and what each one commits the proposer
// to, both come from the rules themselves (lib/domain/proposal-draft reads
// lib/config/governance). This file used to carry its own copy of the hints —
// "Humans only, supermajority" — which is a sentence that must never drift from
// the table it describes, because a member reads it right before signing.
const CATEGORIES = FILEABLE_CATEGORIES.map((value) => ({
  value,
  label: CATEGORY_LABEL[value],
  hint: categoryConsequence(value),
}));

export default function FileProposal({
  orgSlug,
  memberAddress,
  initial = null,
}: {
  orgSlug: string;
  /** The member's Bitcoin address, when they have one to sign with. */
  memberAddress: string | null;
  /** Pre-filled from a link (OrangeCat, a ratification link). Everything stays editable. */
  initial?: ProposalDraft | null;
}) {
  const [category, setCategory] = useState<string>(initial?.category ?? DEFAULT_CATEGORY);
  const [method, setMethod] = useState<string>("");
  const [optionText, setOptionText] = useState("");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [signature, setSignature] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [verdict, setVerdict] = useState<Verdict | null>(null);

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
  const message =
    ready && memberAddress
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

  async function submit(withKey: boolean) {
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
          ...(withKey && memberAddress ? { proposerAddress: memberAddress, signature } : {}),
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
          The proposal is on the record as a draft. Opening it starts the voting window and freezes
          the rules.
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
      {initial?.origin && (
        <p className="text-sm text-fg-secondary">
          Pre-filled from{" "}
          <a
            href={initial.origin.url}
            target="_blank"
            rel="noreferrer"
            className="text-fg-primary underline underline-offset-2"
          >
            your {initial.origin.entityType} on OrangeCat
          </a>
          . Change anything before you file it.
        </p>
      )}
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
        <MethodPicker methods={ALL_METHODS} value={method} onChange={(m) => setMethod(m)} />
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
        {memberAddress && (
          <p className="mt-1.5 text-xs text-fg-tertiary">
            If you sign, the title and category are bound into your signature; the rationale is not,
            so it stays editable context rather than a signed claim.
          </p>
        )}
      </div>

      <ActStep
        label="File proposal"
        onAct={() => submit(false)}
        disabled={!ready}
        submitting={submitting}
        rejection={verdict && !verdict.created ? (verdict.reason ?? "Proposal rejected.") : null}
        signing={
          memberAddress
            ? {
                message,
                hint: <>{memberAddress.slice(0, 10)}…</>,
                signature,
                onSignatureChange: setSignature,
                onSubmitSigned: () => submit(true),
              }
            : undefined
        }
      />
    </div>
  );
}
