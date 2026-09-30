import { Link } from "@/i18n/navigation";
import type { AuditEvent } from "@/lib/db/schema";
import TechnicalDetails from "@/components/ui/technical-details";
import { EVENT_LABEL, eventGloss } from "@/lib/domain/event-gloss";

/**
 * An organization's audit trail, rendered from its rows.
 *
 * Shared by /governance/audit and /orgs/[slug]: the second page needed the same
 * list, and a second copy of the labels and the gloss is how two pages come to
 * describe one event two ways.
 */

/** Where a given audit subject can actually be inspected. */
const SUBJECT_ACTION: Record<string, string> = {
  proposal: "See the suggestion",
  voting_session: "See the full record",
};

function subjectHref(subjectType: string, subjectId: string): string | null {
  if (subjectType === "proposal") return `/proposals/${subjectId}`;
  // The decision document is the verifiable artifact for a session: proposal,
  // electorate snapshot, every signed vote, tally and threshold rule.
  if (subjectType === "voting_session") return `/api/v1/decisions/${subjectId}`;
  return null;
}

export default function AuditTrail({ events }: { events: AuditEvent[] }) {
  return (
    <ol className="space-y-3">
      {events.map((e) => {
        const href = subjectHref(e.subjectType, e.subjectId);
        const summary = eventGloss(e.eventType, e.payload);
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
              <TechnicalDetails>
                <pre className="whitespace-pre-wrap break-all rounded-control border border-default bg-surface-raised p-2 font-mono text-fg-primary">
                  {e.eventType} {e.subjectType}:{e.subjectId}
                  {"\n"}
                  {JSON.stringify(e.payload, null, 2)}
                </pre>
              </TechnicalDetails>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
