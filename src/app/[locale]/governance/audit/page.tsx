import { Link } from "@/i18n/navigation";
import PageLayout from "@/components/ui/page-layout";
import AuditTrail from "@/components/governance/audit-trail";
import TechnicalDetails from "@/components/ui/technical-details";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { auditEvents } from "@/lib/db/schema";
import { primaryOrg } from "@/lib/domain/org";
import type { AuditEvent } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

/**
 * The public audit trail: every governance event, append-only, rendered
 * straight from the database. This page shows the record itself — no
 * summaries, no derived metrics, nothing that can't be traced to a row.
 */
export default async function AuditPage() {
  let org = null;
  let events: AuditEvent[] = [];
  let dbError = false;
  try {
    org = (await primaryOrg()) ?? null;
    if (org) {
      events = await db.query.auditEvents.findMany({
        where: eq(auditEvents.organizationId, org.id),
        orderBy: desc(auditEvents.createdAt),
        limit: 200,
      });
    }
  } catch {
    dbError = true;
  }

  return (
    <PageLayout
      kicker="Decisions"
      title="The record"
      description="Everything that has happened, in order: who joined, what was suggested, how each vote went. Nothing on it is ever changed or deleted."
    >
      <div className="max-w-3xl space-y-6">
        {dbError && (
          <p className="text-fg-secondary">
            This cannot be loaded right now. Please try again in a minute.
          </p>
        )}
        {!dbError && !org && (
          <p className="text-fg-secondary">
            There is no organization here yet, so nothing to show.
          </p>
        )}
        {org && (
          <>
            <div className="rounded-surface border border-default bg-surface-raised p-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <p className="text-sm text-fg-secondary">
                  The latest {events.length} entries for{" "}
                  <span className="font-semibold text-fg-primary">{org.name}</span>.
                </p>
                <Link href="/propose" className="btn-primary shrink-0">
                  Suggest something
                </Link>
              </div>
              <TechnicalDetails className="mt-3">
                <p>
                  Append-only: no code path updates or deletes an entry. The same record as data:{" "}
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
            <AuditTrail events={events} />
          </>
        )}
      </div>
    </PageLayout>
  );
}
