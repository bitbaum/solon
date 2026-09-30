import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import PageLayout from "@/components/ui/page-layout";
import AuditTrail from "@/components/governance/audit-trail";
import { db } from "@/lib/db/client";
import { auditEvents, members } from "@/lib/db/schema";
import { orgBySlug, primaryOrg } from "@/lib/domain/org";
import { profileFor, usesMandates } from "@/lib/config/governance-profiles";
import { COLLECTIVE_KINDS, LEGAL_STATUS_LABEL, formatPlace } from "@/lib/collective-kinds";
import { ECOSYSTEM_PILLARS } from "@/lib/config/ecosystem";
import { isMandateLive } from "@/lib/domain/mandate";
import { MemberFace } from "@/components/ui/member-face";
import TechnicalDetails from "@/components/ui/technical-details";

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
  const profile = profileFor(org.governanceProfile);
  const now = new Date();

  const fact = (label: string, value: React.ReactNode) => (
    <div className="flex justify-between gap-4">
      <dt className="text-fg-secondary">{label}</dt>
      <dd className="text-right text-fg-primary">{value}</dd>
    </div>
  );

  return (
    <PageLayout kicker="Organization" title={org.name} description={org.description ?? undefined}>
      <div className="max-w-3xl space-y-10">
        <div className="rounded-surface border border-default bg-surface-base p-6">
          <dl className="space-y-2 text-sm">
            {fact("Founded", org.createdAt.toISOString().slice(0, 10))}
            {fact("Kind of group", COLLECTIVE_KINDS[org.kind].name)}
            {org.countryCode &&
              org.region &&
              org.locality &&
              fact(
                "Place",
                formatPlace({
                  country_code: org.countryCode,
                  region: org.region,
                  locality: org.locality,
                }),
              )}
            {org.legalStatus !== "informal" &&
              fact(
                "Legal status",
                `${LEGAL_STATUS_LABEL[org.legalStatus]}${org.legalForm ? ` · ${org.legalForm}` : ""}`,
              )}
            {org.orangecatGroupId &&
              fact(
                "Wallet",
                <a
                  href={`${ECOSYSTEM_PILLARS.find((p) => p.key === "orangecat")!.url}/groups/${org.slug}`}
                  className="hover:underline"
                >
                  on OrangeCat
                </a>,
              )}
            {fact(
              "Who decides",
              <Link
                href="/governance/profiles"
                className="hover:underline"
                title={profile.suitedTo}
              >
                {profile.label}
              </Link>,
            )}
            {org.claimedProject && fact("Runs", org.claimedProject)}
          </dl>
          <TechnicalDetails className="mt-5">
            <p>
              Address: <span className="font-mono text-fg-primary">/orgs/{org.slug}</span>
            </p>
            <p>
              The same facts as data:{" "}
              <Link
                href={`/api/orgs/${org.slug}`}
                className="font-mono text-accent hover:underline"
              >
                /api/orgs/{org.slug}
              </Link>{" "}
              and the full history at{" "}
              <Link
                href={`/api/orgs/${org.slug}/audit`}
                className="font-mono text-accent hover:underline"
              >
                /api/orgs/{org.slug}/audit
              </Link>
              .
            </p>
          </TechnicalDetails>
        </div>

        {/* Said before the members, in the profile's own words, because it is
            what someone deciding whether to join most needs to know — and the
            one thing an organization should never leave to be inferred. */}
        <p className="text-sm leading-relaxed text-fg-secondary">{profile.whoDecides}</p>

        {/* Written only for an organization that is not #1, because only there is
            it true: the proposal and voting screens on this site are built for
            the primary organization today. The history below is complete either way. */}
        {!isPrimary && primary && (
          <p className="rounded-surface border border-default bg-surface-raised p-4 text-sm leading-relaxed text-fg-secondary">
            Suggesting and voting on this site work for {primary.name} for now, not yet for{" "}
            {org.name}. Its members and its history are public below.
          </p>
        )}

        <section>
          <h2 className="mb-4 headline text-display-3 text-fg-primary">
            Members <span className="text-fg-tertiary">({roster.length})</span>
          </h2>
          {roster.length === 0 ? (
            <p className="text-sm text-fg-secondary">Nobody has joined yet.</p>
          ) : (
            <ul className="space-y-3">
              {roster.map((m) => (
                <li
                  key={m.id}
                  className="rounded-control border border-default bg-surface-base p-4 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-2 font-semibold text-fg-primary">
                      <MemberFace
                        name={m.displayName}
                        username={m.ocUsername ?? null}
                        avatarUrl={m.avatarUrl ?? null}
                        size={28}
                      />
                      {m.displayName}
                    </span>
                    <span className="text-xs text-fg-secondary">
                      {m.memberType === "AGENT" ? "AI agent" : "Person"}
                      {Number(m.votingWeight) !== 1 &&
                        ` · their vote counts ${Number(m.votingWeight)} times`}
                      {m.status !== "ACTIVE" && ` · ${m.status.toLowerCase()}`}
                      {usesMandates(profile) &&
                        isMandateLive(m, now) &&
                        ` · decides on the group's behalf${
                          m.mandateUntil
                            ? ` until ${m.mandateUntil.toISOString().slice(0, 10)}`
                            : ""
                        }`}
                    </span>
                  </div>
                  {(m.bitcoinAddress || m.system) && (
                    <TechnicalDetails className="mt-3">
                      {m.system && (
                        <p>
                          System: <span className="font-mono text-fg-primary">{m.system}</span>
                        </p>
                      )}
                      {m.bitcoinAddress && (
                        <p className="break-all">
                          Signs votes with the Bitcoin key{" "}
                          <span className="font-mono text-fg-primary">{m.bitcoinAddress}</span>
                        </p>
                      )}
                    </TechnicalDetails>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-4 headline text-display-3 text-fg-primary">What has happened</h2>
          {events.length === 0 ? (
            <p className="text-sm text-fg-secondary">Nothing has happened yet.</p>
          ) : (
            <AuditTrail events={events} />
          )}
        </section>
      </div>
    </PageLayout>
  );
}
