"use client";

import { useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
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
        reason: "The connection dropped, so nothing was saved. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  const active = CATEGORIES.find((c) => c.value === category);

  if (verdict?.created) {
    return (
      <div className="rounded-surface border border-default bg-surface-base p-6">
        <h2 className="headline text-display-3 text-fg-primary">Saved as a draft</h2>
        <p className="mt-3 text-sm text-fg-secondary">
          Everyone can read it now. Members can vote once someone starts the vote.
        </p>
        <div className="mt-6 flex flex-wrap gap-4">
          <Link href={`/proposals/${verdict.proposalId}`} className="btn-primary">
            Start the vote
          </Link>
          <Link
            href="/proposals"
            className="self-center text-sm text-fg-secondary transition-colors hover:text-fg-primary"
          >
            See all decisions →
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
          . Change anything you like before you save it.
        </p>
      )}
      <div>
        <label className="block text-sm font-medium text-fg-primary" htmlFor="p-category">
          What is it about?
        </label>
        <select
          id="p-category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="field mt-2"
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
              The choices, one per line
            </label>
            <textarea
              id="p-options"
              rows={4}
              value={optionText}
              onChange={(e) => setOptionText(e.target.value)}
              placeholder={"Solar roof\nHeat pump\nInsulation"}
              className="field mt-2 py-3"
            />
            {options ? (
              <p className="mt-1.5 text-xs text-fg-tertiary">
                Members will choose between: {options.map((o) => o.label).join(", ")}
              </p>
            ) : (
              <p className="mt-1.5 text-xs text-fg-tertiary">
                At least two choices, each on its own line.
              </p>
            )}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-fg-primary" htmlFor="p-title">
          Your suggestion in a sentence
        </label>
        <input
          id="p-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="For example: Buy a second cargo bike for deliveries"
          className="field mt-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-fg-primary" htmlFor="p-body">
          Why?
        </label>
        <textarea
          id="p-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={6}
          placeholder="Why this, and what changes if members agree."
          className="field mt-2 py-3"
        />
        {memberAddress && (
          <p className="mt-1.5 text-xs text-fg-tertiary">
            If you sign with your Bitcoin key, the sentence and topic are sealed by your signature;
            the explanation is not, so you can still add to it.
          </p>
        )}
      </div>

      <ActStep
        label="Save as draft"
        onAct={() => submit(false)}
        disabled={!ready}
        submitting={submitting}
        rejection={
          verdict && !verdict.created ? (verdict.reason ?? "This could not be saved.") : null
        }
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
