import Link from "next/link";
import SplitDeclaration from "@/components/governance/split-declaration";
import { allocationReport } from "@/lib/domain/allocation";
import { CONTRIBUTION_POLICY_KEY } from "@/lib/config/contribution";
import { primaryOrg } from "@/lib/domain/org";
import type { Standing } from "@/lib/domain/allocation/aggregate";

export const metadata = {
  title: "Contributions — Solon",
  description: "Direct your own contribution across local, state and federal government.",
};
export const dynamic = "force-dynamic";

/** How a member is being counted, in words rather than a status code. */
function standingLabel(standing: Standing): string {
  switch (standing) {
    case "declared":
      return "counted as declared";
    case "undeclared":
      return "has not declared — counted at the fallback";
    case "out_of_bounds":
      return "declared under bounds that have since changed — counted at the fallback";
  }
}

/**
 * The contribution split: what the organization decided about the bounds, what
 * its members decided inside them, and what therefore applies.
 *
 * The page is deliberately honest about the difference between those last two.
 * A headline "41% local" built mostly from a fallback nobody chose would be
 * technically true and substantially misleading, so the share of the split
 * that is anybody's actual choice is stated next to the split itself.
 */
export default async function ContributionsPage() {
  const org = await primaryOrg();
  const report = org ? await allocationReport(org.id) : null;

  if (!org || !report) {
    return (
      <main className="section-shell py-section-tight">
        <h1 className="font-display text-display-2 text-fg-primary">Contributions</h1>
        <p className="mt-4 text-fg-secondary">
          No organization is governed here yet. Contribution splits appear once one exists.
        </p>
      </main>
    );
  }

  const { aggregate, policy, declarations, tierSources, version: policyVersion } = report;
  const declaredPercent = Math.round(aggregate.declaredWeightPercent);

  return (
    <main className="section-shell py-section-tight">
      <div className="mx-auto max-w-lede text-center">
        <h1 className="font-display text-display-2 text-fg-primary">Where your contribution goes</h1>
        <p className="mt-6 text-lg text-fg-secondary">
          A contribution is not a payment to &ldquo;the government&rdquo; — it is a payment to
          several governments at once. Which of them gets what share is a question you have
          standing to answer.
        </p>
      </div>

      <div className="mt-16 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          {/* ---- The effective split ---- */}
          <section className="rounded-surface border border-default bg-surface-base p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="font-display text-display-3 text-fg-primary">
                {org.name}&rsquo;s split
              </h2>
              <span className="text-sm text-fg-secondary">
                {declaredPercent}% of it is somebody&rsquo;s stated choice
              </span>
            </div>

            <ul className="mt-6 space-y-5">
              {aggregate.tiers.map((tier) => (
                <li key={tier.key}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-fg-primary font-semibold">{tier.label}</span>
                    <span className="font-mono text-fg-primary">{tier.displayPercent}%</span>
                  </div>
                  {tier.description && (
                    <p className="mt-1 text-sm text-fg-secondary">{tier.description}</p>
                  )}
                  <div className="mt-2 h-2 w-full bg-surface-raised border border-default">
                    <div
                      className="h-full bg-accent"
                      style={{ width: `${Math.min(100, tier.displayPercent)}%` }}
                    />
                  </div>
                  <p className="mt-2 text-sm text-fg-secondary">
                    Policy allows {tier.floorPercent}%–{tier.ceilingPercent}%.{" "}
                    {tier.declaredPercent === null
                      ? "Nobody has declared yet, so this is the fallback."
                      : `Members who declared chose ${Math.round(tier.declaredPercent)}% on average.`}
                  </p>
                  {(tierSources[tier.key] ?? []).length > 0 && (
                    <p className="mt-1 text-sm text-fg-secondary">
                      Watch-only:{" "}
                      {(tierSources[tier.key] ?? []).map((source, i) => (
                        <span key={source.address}>
                          {i > 0 && ", "}
                          <a
                            href={`https://mempool.space/address/${source.address}`}
                            className="font-semibold text-accent hover:text-accent-dark"
                            rel="noreferrer"
                            target="_blank"
                          >
                            {source.label}
                          </a>
                        </span>
                      ))}
                    </p>
                  )}
                </li>
              ))}
            </ul>

            <p className="mt-6 border-t border-subtle pt-4 text-sm text-fg-secondary">
              {aggregate.counts.declared} of {aggregate.counts.members} members have declared.
              {aggregate.counts.outOfBounds > 0 &&
                ` ${aggregate.counts.outOfBounds} declared under bounds that have since changed and are counted at the fallback until they sign again.`}{" "}
              Recompute any of this from{" "}
              <Link
                href={`/api/orgs/${org.slug}/allocation`}
                className="font-semibold text-accent hover:text-accent-dark"
              >
                the public record
              </Link>
              .
            </p>
          </section>

          {/* ---- Who declared what ---- */}
          <section className="rounded-surface border border-default bg-surface-base p-6">
            <h2 className="font-display text-display-3 text-fg-primary">The declarations</h2>
            <p className="mt-2 text-sm text-fg-secondary">
              Public, for the same reason votes are: a split only the server can see is one the
              server could misreport with nobody able to tell.
            </p>

            <ul className="mt-6 divide-y divide-subtle">
              {declarations.map((row) => (
                <li key={row.memberId} className="py-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <span className="text-fg-primary font-semibold">{row.displayName}</span>
                    <span className="font-mono text-sm text-fg-secondary">
                      {row.splits
                        ? policy.tiers
                            .map((tier) => `${tier.label} ${row.splits?.[tier.key] ?? 0}%`)
                            .join(" · ")
                        : "—"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-fg-secondary">
                    {standingLabel(row.standing)}
                    {row.version !== null && ` · version ${row.version}`}
                    {row.weight !== 1 && ` · weight ${row.weight}`}
                    {row.version !== null && (
                      <>
                        {" · "}
                        <Link
                          href={`/api/orgs/${org.slug}/allocation/${row.address}`}
                          className="font-semibold text-accent hover:text-accent-dark"
                        >
                          every version, signed
                        </Link>
                      </>
                    )}
                  </p>
                </li>
              ))}
              {declarations.length === 0 && (
                <li className="py-4 text-sm text-fg-secondary">
                  No members yet. The fallback is what would apply to the first one.
                </li>
              )}
            </ul>
          </section>
        </div>

        {/* ---- Declare, and the rules behind it ---- */}
        <div className="space-y-8">
          <SplitDeclaration orgSlug={org.slug} tiers={policy.tiers} policyVersion={policyVersion} />

          <section className="rounded-surface border border-default bg-surface-raised p-6">
            <h2 className="font-semibold text-fg-primary">Who decides what</h2>
            <dl className="mt-4 space-y-4 text-sm">
              <div>
                <dt className="text-fg-primary font-semibold">The bounds — the members</dt>
                <dd className="mt-1 text-fg-secondary">
                  Which tiers exist, the floor and ceiling on each, and what applies to someone
                  who has not declared. That is policy content, changed only by an approved{" "}
                  <span className="font-mono">ALLOCATION_POLICY</span> vote.{" "}
                  {policyVersion === null ? (
                    <>
                      Nothing has been enacted here, so the widest bounds apply — a floor nobody
                      voted for is a floor nobody consented to.
                    </>
                  ) : (
                    <>
                      Version {policyVersion} is in force.{" "}
                      <Link
                        href={`/api/orgs/${org.slug}/policies/${CONTRIBUTION_POLICY_KEY}`}
                        className="font-semibold text-accent hover:text-accent-dark"
                      >
                        Every version, with the vote that produced it
                      </Link>
                      .
                    </>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-fg-primary font-semibold">The split inside them — you</dt>
                <dd className="mt-1 text-fg-secondary">
                  A majority can decide that at least a fifth of every contribution goes federal.
                  A majority cannot decide where your remaining four fifths go: there is no
                  operator route to your split and no vote that reaches it, only a signature from
                  your own key.
                </dd>
              </div>
              <div>
                <dt className="text-fg-primary font-semibold">Changing your mind</dt>
                <dd className="mt-1 text-fg-secondary">
                  Declaring again writes a new version and marks the old one superseded. Nothing
                  is erased, so what you were directing last spring stays answerable — with the
                  signature that answered it.
                </dd>
              </div>
            </dl>

            {report.enactedContentUnreadable && (
              <p className="mt-4 rounded-control border border-default bg-surface-base p-3 text-sm text-fg-primary">
                The enacted policy version cannot be read, so the default bounds are standing in.
                Members are being held to bounds nobody voted for until a new{" "}
                <span className="font-mono">ALLOCATION_POLICY</span> decision fixes it.
              </p>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
