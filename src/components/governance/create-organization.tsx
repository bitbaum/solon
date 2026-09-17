"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { organizationMessage } from "@/lib/bitcoin/message";
import { nameProblem, slugProblem } from "@/lib/domain/organization-rules";
import type { LokiGrant } from "@/lib/loki-grant";
import SignatureStep from "./signature-step";

interface Verdict {
  created: boolean;
  verified: boolean;
  reason?: string;
  slug?: string;
}

/**
 * Founding is the same shape as claiming a seat: fill in the fields, sign the
 * exact text shown, paste the signature. No wallet-connect step to fail — the
 * same fields work in Sparrow, Electrum and Bitcoin Core.
 *
 * The signed text binds the address, the name, the identity and (when Loki
 * vouched) the project, so editing any of them after signing changes the text
 * and the old signature stops verifying. That is the point, not a bug.
 */
export default function CreateOrganization({
  actorId,
  defaultFounderName,
  prefill,
  grant,
}: {
  actorId: string;
  defaultFounderName: string;
  prefill: { slug: string; name: string; description: string };
  grant: LokiGrant | null;
}) {
  const router = useRouter();
  const [slug, setSlug] = useState(prefill.slug);
  const [name, setName] = useState(prefill.name);
  const [description, setDescription] = useState(prefill.description);
  const [founderName, setFounderName] = useState(defaultFounderName);
  const [address, setAddress] = useState("");
  const [signature, setSignature] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [verdict, setVerdict] = useState<Verdict | null>(null);

  const slugIssue = slug ? slugProblem(slug) : null;
  const nameIssue = name ? nameProblem(name) : null;
  const ready =
    !!slug && !slugIssue && !!name && !nameIssue && !!address && founderName.trim().length >= 2;

  const message = ready
    ? organizationMessage({
        slug,
        name: name.trim(),
        actorId,
        founderAddress: address,
        project: grant?.project ?? null,
      })
    : null;

  async function submit() {
    setSubmitting(true);
    setVerdict(null);
    try {
      const res = await fetch("/api/orgs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          name,
          description: description.trim() || null,
          founderName,
          address,
          signature,
          grant,
        }),
      });
      const body = (await res.json()) as Verdict;
      setVerdict(body);
      if (body.created && body.slug) router.push(`/orgs/${body.slug}`);
    } catch {
      setVerdict({
        created: false,
        verified: false,
        reason: "network error — nothing was submitted",
      });
    } finally {
      setSubmitting(false);
    }
  }

  const field =
    "mt-1 w-full rounded-control border border-default bg-surface-raised px-3 py-2 text-sm text-fg-primary";

  return (
    <div className="space-y-5 rounded-surface border border-default bg-surface-base p-6">
      <div>
        <label className="block text-sm font-medium text-fg-primary" htmlFor="org-slug">
          Address
        </label>
        <input
          id="org-slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
          placeholder="e.g. wednesday-supper"
          className={`${field} font-mono`}
        />
        <p className="mt-1.5 text-xs text-fg-tertiary">
          {slugIssue ?? `The organization's public page will be /orgs/${slug || "…"}.`}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-fg-primary" htmlFor="org-name">
          Name
        </label>
        <input
          id="org-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={field}
        />
        {nameIssue && <p className="mt-1.5 text-xs text-fg-tertiary">{nameIssue}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-fg-primary" htmlFor="org-description">
          What it governs <span className="text-fg-tertiary">(optional)</span>
        </label>
        <textarea
          id="org-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          maxLength={500}
          className={field}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-fg-primary" htmlFor="org-founder">
          Your name on the roster
        </label>
        <input
          id="org-founder"
          value={founderName}
          onChange={(e) => setFounderName(e.target.value)}
          className={field}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-fg-primary" htmlFor="org-address">
          Your Bitcoin address
        </label>
        <input
          id="org-address"
          value={address}
          onChange={(e) => setAddress(e.target.value.trim())}
          placeholder="bc1… or 1…"
          className={`${field} font-mono`}
        />
        <p className="mt-1.5 text-xs text-fg-tertiary">
          This becomes your voting credential in this organization. Every vote you cast must recover
          to it, so use a key you control and can sign with again.
        </p>
      </div>

      <SignatureStep
        message={message}
        signHint="that address"
        signatureId="org-signature"
        signature={signature}
        onSignatureChange={setSignature}
        placeholder="Paste the base64 signature from your wallet's Sign Message tool"
        disabled={!ready}
        submitting={submitting}
        submitLabel="Found the organization"
        onSubmit={submit}
        rejection={verdict && !verdict.created ? (verdict.reason ?? "Founding failed.") : null}
      />
    </div>
  );
}
