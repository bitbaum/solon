import Link from "next/link";
import PageLayout from "@/components/ui/page-layout";
import AuditTrail from "@/components/governance/audit-trail";
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
      title="Audit Trail"
      description="Every governance event, append-only — the record itself, not a summary of it"
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {dbError && (
          <p className="text-center text-fg-secondary">
            The audit register is currently unreachable. No events can be shown.
          </p>
        )}
        {!dbError && !org && (
          <p className="text-center text-fg-secondary">
            No organization is registered yet, so there is no audit trail to show.
          </p>
        )}
        {org && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-surface border border-default bg-surface-raised p-4">
              <p className="text-sm text-fg-secondary">
                {events.length} most recent events for{" "}
                <span className="font-semibold text-fg-primary">{org.name}</span>. Append-only: no
                code path updates or deletes them.
              </p>
              <div className="flex shrink-0 items-center gap-4">
                <Link
                  href={`/api/orgs/${org.slug}/audit`}
                  className="text-sm text-fg-secondary transition-colors hover:text-fg-primary"
                >
                  Raw JSON →
                </Link>
                <Link href="/proposals" className="btn-primary">
                  Add to the record
                </Link>
              </div>
            </div>
            <AuditTrail events={events} />
          </>
        )}
      </div>
    </PageLayout>
  );
}
