import { Link } from "@/i18n/navigation";
import type { AuditEvent, AuditEventType } from "@/lib/db/schema";

/**
 * An organization's audit trail, rendered from its rows.
 *
 * Shared by /governance/audit and /orgs/[slug]: the second page needed the same
 * list, and a second copy of the labels and the gloss is how two pages come to
 * describe one event two ways.
 */

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
 * Keys that belong in the raw event and never in a one-line gloss: a note is
 * prose, and a signature or the multi-line text it signs is bytes to verify,
 * not something to read at a glance.
 */
const NOT_GLOSSED = new Set(["note", "signature", "signedMessage"]);

/**
 * A one-line gloss of the payload so the trail is readable at a glance. The
 * exact bytes stay one click away in "Raw event" — the summary is a
 * convenience, never a replacement for the record.
 */
function summarize(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const entries = Object.entries(payload as Record<string, unknown>)
    .filter(([k, v]) => !NOT_GLOSSED.has(k) && v !== null && typeof v !== "object")
    .slice(0, 4);
  if (entries.length === 0) return null;
  return entries
    .map(([k, v]) => `${k.replace(/([A-Z])/g, " $1").toLowerCase()}: ${String(v)}`)
    .join(" · ");
}

export default function AuditTrail({ events }: { events: AuditEvent[] }) {
  return (
    <ol className="space-y-3">
      {events.map((e) => {
        const href = subjectHref(e.subjectType, e.subjectId);
        const summary = summarize(e.payload);
        return (
          <li key={e.id} className="rounded-control border border-default bg-surface-base p-4">
            <div className="flex items-baseline justify-between gap-4">
              <span className="font-semibold text-fg-primary">{EVENT_LABEL[e.eventType]}</span>
              <time
                className="whitespace-nowrap text-xs text-fg-secondary"
                dateTime={e.createdAt.toISOString()}
              >
                {e.createdAt.toISOString().replace("T", " ").slice(0, 19)} UTC
              </time>
            </div>

            {summary && <p className="mt-1.5 text-sm text-fg-secondary">{summary}</p>}

            <div className="mt-3 flex flex-wrap items-center gap-4">
              {href && (
                <Link href={href} className="text-sm text-accent hover:underline">
                  {SUBJECT_ACTION[e.subjectType] ?? "Open"} →
                </Link>
              )}
              <details className="text-xs">
                <summary className="cursor-pointer text-fg-tertiary">Raw event</summary>
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
  );
}
