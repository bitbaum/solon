import Link from "next/link";
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


/** Where a given audit subject can actually be inspected. */
const SUBJECT_ACTION: Record<string, string> = {
  proposal: "Open the proposal",
  voting_session: "Verify the decision document",
};

function subjectHref(subjectType: string, subjectId: string): string | null {
  if (subjectType === "proposal") return `/proposals/${subjectId}`;
  // The decision document is the verifiable artifact for a session: proposal,
  // electorate snapshot, every signed vote, tally and threshold rule.
  if (subjectType === "voting_session") return `/api/v1/decisions/${subjectId}`;
  return null;
}

/**
 * A one-line gloss of the payload so the trail is readable at a glance. The
 * exact bytes stay one click away in "Raw event" — the summary is a
 * convenience, never a replacement for the record.
 */
function summarize(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const entries = Object.entries(payload as Record<string, unknown>)
    .filter(([k, v]) => k !== "note" && v !== null && typeof v !== "object")
    .slice(0, 4);
  if (entries.length === 0) return null;
  return entries.map(([k, v]) => `${k.replace(/([A-Z])/g, " $1").toLowerCase()}: ${String(v)}`).join(" · ");
}

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
    org = await prisma.organization.findFirst({
      orderBy: { createdAt: "asc" },
    });
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
          <p className="text-center text-fg-secondary">
            The audit register is currently unreachable. No events can be shown.
          </p>
        )}
        {!dbError && !org && (
          <p className="text-center text-fg-secondary">
            No organization is registered yet, so there is no audit trail to
            show.
          </p>
        )}
        {org && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-surface border border-default bg-surface-raised p-4">
              <p className="text-sm text-fg-secondary">
                {events.length} most recent events for{" "}
                <span className="font-semibold text-fg-primary">{org.name}</span>
                . Append-only: no code path updates or deletes them.
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
            <ol className="space-y-3">
              {events.map((e) => {
                const href = subjectHref(e.subjectType, e.subjectId);
                const summary = summarize(e.payload);
                return (
                  <li
                    key={e.id}
                    className="rounded-control border border-default bg-surface-base p-4"
                  >
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="font-semibold text-fg-primary">
                        {EVENT_LABEL[e.eventType]}
                      </span>
                      <time
                        className="whitespace-nowrap text-xs text-fg-secondary"
                        dateTime={e.createdAt.toISOString()}
                      >
                        {e.createdAt.toISOString().replace("T", " ").slice(0, 19)} UTC
                      </time>
                    </div>

                    {summary && (
                      <p className="mt-1.5 text-sm text-fg-secondary">{summary}</p>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-4">
                      {href && (
                        <Link href={href} className="text-sm text-accent hover:underline">
                          {SUBJECT_ACTION[e.subjectType] ?? "Open"} →
                        </Link>
                      )}
                      <details className="text-xs">
                        <summary className="cursor-pointer text-fg-tertiary">
                          Raw event
                        </summary>
                        <pre className="mt-2 whitespace-pre-wrap break-all rounded-control border border-default bg-surface-raised p-2 font-mono text-fg-primary">
                          {e.subjectType}:{e.subjectId}
                          {"\n"}
                          {JSON.stringify(e.payload, null, 2)}
                        </pre>
                      </details>
                    </div>
                  </li>
                );
              })}
            </ol>
          </>
        )}
      </div>
    </PageLayout>
  );
}
