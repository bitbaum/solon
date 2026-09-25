import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import PageLayout from "@/components/ui/page-layout";
import AuditTrail from "@/components/governance/audit-trail";
import { db } from "@/lib/db/client";
import { auditEvents, members } from "@/lib/db/schema";
import { orgBySlug, primaryOrg } from "@/lib/domain/org";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const org = await orgBySlug(slug);
  return { title: org ? `${org.name} — Solon` : "Organization — Solon" };
}

/**
 * One organization, as public record: who sits on the roster and what has been
 * decided. The same facts GET /api/orgs/{slug} and /audit serve, for a person.
 *
 * Until this page existed, every link to an organization — Loki's fleet map and
 * the bitbaum studio site both build /orgs/{slug} — answered 404, including the
 * link to organization #1.
 */
export default async function OrganizationPage({ params }: { params: Params }) {
  const { slug } = await params;
  const org = await orgBySlug(slug);
  if (!org) notFound();

  const [roster, events, primary] = await Promise.all([
    db.query.members.findMany({
      where: eq(members.organizationId, org.id),
      orderBy: asc(members.joinedAt),
    }),
    db.query.auditEvents.findMany({
      where: eq(auditEvents.organizationId, org.id),
      orderBy: desc(auditEvents.createdAt),
      limit: 50,
    }),
    primaryOrg(),
  ]);
  const isPrimary = primary?.id === org.id;

  const fact = (label: string, value: React.ReactNode) => (
    <div className="flex justify-between gap-4">
      <dt className="text-fg-secondary">{label}</dt>
      <dd className="text-right text-fg-primary">{value}</dd>
    </div>
  );

  return (
    <PageLayout title={org.name} description={org.description ?? undefined}>
      <div className="mx-auto max-w-4xl space-y-10">
        <dl className="mx-auto max-w-2xl space-y-2 rounded-surface border border-default bg-surface-base p-6 text-sm">
          {fact("Address", <span className="font-mono">/orgs/{org.slug}</span>)}
          {fact("Founded", org.createdAt.toISOString().slice(0, 10))}
          {fact("Decides by", org.governanceProfile)}
          {org.claimedProject &&
            fact("Governs", <span className="font-mono">{org.claimedProject}</span>)}
        </dl>

        {/* Written only for an organization that is not #1, because only there is
            it true: the proposal and voting screens on this site are built for
            the primary organization today. The record below is complete either way. */}
        {!isPrimary && primary && (
          <p className="mx-auto max-w-2xl rounded-surface border border-default bg-surface-raised p-4 text-sm leading-relaxed text-fg-secondary">
            The proposal and voting screens on this site run for {primary.name} today. {org.name}
            &apos;s roster and record are public here and at{" "}
            <Link href={`/api/orgs/${org.slug}`} className="font-mono text-accent hover:underline">
              /api/orgs/{org.slug}
            </Link>
            ; screens for its own votes are not built yet.
          </p>
        )}

        <section>
          <h2 className="mb-4 font-semibold text-fg-primary">
            Roster <span className="text-fg-tertiary">({roster.length})</span>
          </h2>
          {roster.length === 0 ? (
            <p className="text-sm text-fg-secondary">Nobody holds a seat yet.</p>
          ) : (
            <ul className="space-y-3">
              {roster.map((m) => (
                <li
                  key={m.id}
                  className="rounded-control border border-default bg-surface-base p-4 text-sm"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-semibold text-fg-primary">{m.displayName}</span>
                    <span className="text-xs text-fg-secondary">
                      {m.memberType === "AGENT"
                        ? `Agent · ${m.system ?? "unnamed system"}`
                        : "Human"}
                      {" · "}weight {Number(m.votingWeight)}
                      {m.status !== "ACTIVE" && ` · ${m.status.toLowerCase()}`}
                    </span>
                  </div>
                  <p className="mt-1.5 break-all font-mono text-xs text-fg-secondary">
                    {m.bitcoinAddress ?? "votes with an OrangeCat account"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-4">
            <h2 className="font-semibold text-fg-primary">Record</h2>
            <Link
              href={`/api/orgs/${org.slug}/audit`}
              className="text-sm text-fg-secondary transition-colors hover:text-fg-primary"
            >
              Raw JSON →
            </Link>
          </div>
          {events.length === 0 ? (
            <p className="text-sm text-fg-secondary">Nothing is on the record yet.</p>
          ) : (
            <AuditTrail events={events} />
          )}
        </section>
      </div>
    </PageLayout>
  );
}
