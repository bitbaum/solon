import PageLayout from "@/components/ui/page-layout";
import { prisma } from "@/lib/db";
import type { AuditEvent, AuditEventType } from "@prisma/client";

export const dynamic = "force-dynamic";

const EVENT_LABEL: Record<AuditEventType, string> = {
  ORG_CREATED: "Organization created",
  MEMBER_ADDED: "Member added",
  MEMBER_STATUS_CHANGED: "Member status changed",
  PROPOSAL_CREATED: "Proposal filed",
  SESSION_OPENED: "Voting session opened",
  VOTE_CAST: "Vote cast",
  SESSION_CLOSED: "Voting session closed",
  POLICY_ACTIVATED: "Policy version activated",
};

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
    org = await prisma.organization.findFirst({ orderBy: { createdAt: "asc" } });
    if (org) {
      events = await prisma.auditEvent.findMany({
        where: { organizationId: org.id },
        orderBy: { createdAt: "desc" },
        take: 200,
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
          <p className="text-center text-gray-600">
            The audit register is currently unreachable. No events can be shown.
          </p>
        )}
        {!dbError && !org && (
          <p className="text-center text-gray-600">
            No organization is registered yet, so there is no audit trail to show.
          </p>
        )}
        {org && (
          <>
            <p className="text-sm text-gray-600 text-center">
              {events.length} most recent events for <span className="font-semibold">{org.name}</span>.
              Audit events are append-only: no code path updates or deletes them.
            </p>
            <ol className="space-y-3">
              {events.map((e) => (
                <li key={e.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="font-semibold text-navy">{EVENT_LABEL[e.eventType]}</span>
                    <time className="text-xs text-gray-500 whitespace-nowrap" dateTime={e.createdAt.toISOString()}>
                      {e.createdAt.toISOString().replace("T", " ").slice(0, 19)} UTC
                    </time>
                  </div>
                  <div className="mt-1 text-xs text-gray-500 font-mono">
                    {e.subjectType}:{e.subjectId}
                  </div>
                  <pre className="mt-2 p-2 rounded-md bg-gray-50 border border-gray-100 text-xs font-mono whitespace-pre-wrap break-all text-gray-700">
                    {JSON.stringify(e.payload, null, 2)}
                  </pre>
                </li>
              ))}
            </ol>
          </>
        )}
      </div>
    </PageLayout>
  );
}
