import Link from "next/link";
import { prisma } from "@/lib/db";
import { sessionTally } from "@/lib/domain/voting";
import { treasuryReport } from "@/lib/domain/treasury";

export const dynamic = "force-dynamic";

/**
 * The overview is a real summary: latest voting session with its tally,
 * treasury standing, and the most recent audit events — each linking to
 * its full view. Every number is read live; empty states say so.
 */
export default async function DashboardOverview() {
  let org = null;
  let session: {
    id: string;
    status: string;
    proposalTitle: string;
    outcome: string | null;
  } | null = null;
  let tallyLine: string | null = null;
  let treasuryLine = "No treasury source registered yet.";
  let events: { id: string; eventType: string; createdAt: Date }[] = [];
  let dbError = false;

  try {
    org = await prisma.organization.findFirst({
      orderBy: { createdAt: "asc" },
    });
    const s = await prisma.votingSession.findFirst({
      orderBy: { opensAt: "desc" },
      include: { proposal: true },
    });
    if (s) {
      session = {
        id: s.id,
        status: s.status,
        proposalTitle: s.proposal.title,
        outcome: s.outcome,
      };
      const t = await sessionTally(s.id);
      tallyLine = `yes ${t.yes} · no ${t.no} · abstain ${t.abstain}`;
    }
    if (org) {
      const report = await treasuryReport(org.id);
      if (report.sources.length > 0) {
        treasuryLine =
          report.totalSats !== null
            ? `${report.sources.length} source(s), ${report.totalSats.toString()} sats on-chain`
            : `${report.sources.length} source(s) registered; balance currently unresolved`;
      }
      events = await prisma.auditEvent.findMany({
        where: { organizationId: org.id },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: { id: true, eventType: true, createdAt: true },
      });
    }
  } catch {
    dbError = true;
  }

  if (dbError) {
    return (
      <main className="space-y-6">
        <h1 className="font-display text-display-3 text-fg-primary">Overview</h1>
        <p className="text-fg-secondary">
          The governance register is currently unreachable. No live data can be
          shown.
        </p>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <h1 className="font-display text-display-3 text-fg-primary">
        {org ? `${org.name} — Overview` : "Overview"}
      </h1>
      {!org && (
        <p className="text-fg-secondary">
          No organization is registered yet. Once one exists, its votes,
          treasury, and audit trail appear here.
        </p>
      )}
      {org && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/dashboard/voting"
            className="block rounded-surface border border-default p-5 hover:border-default transition-colors"
          >
            <div className="text-sm font-semibold text-fg-secondary uppercase tracking-wide mb-2">
              Latest vote
            </div>
            {session ? (
              <>
                <div className="font-semibold text-fg-primary">
                  {session.proposalTitle}
                </div>
                <div className="mt-1 text-sm text-fg-secondary">
                  {session.outcome ?? session.status}
                  {tallyLine ? ` · ${tallyLine}` : ""}
                </div>
              </>
            ) : (
              <div className="text-sm text-fg-secondary">
                No voting session opened yet.
              </div>
            )}
          </Link>

          <Link
            href="/dashboard/treasury"
            className="block rounded-surface border border-default p-5 hover:border-default transition-colors"
          >
            <div className="text-sm font-semibold text-fg-secondary uppercase tracking-wide mb-2">
              Treasury
            </div>
            <div className="text-sm text-fg-secondary">{treasuryLine}</div>
          </Link>

          <Link
            href="/governance/audit"
            className="block rounded-surface border border-default p-5 hover:border-default transition-colors"
          >
            <div className="text-sm font-semibold text-fg-secondary uppercase tracking-wide mb-2">
              Recent activity
            </div>
            {events.length === 0 ? (
              <div className="text-sm text-fg-secondary">
                No audit events yet.
              </div>
            ) : (
              <ul className="space-y-1 text-sm text-fg-secondary">
                {events.map((e) => (
                  <li key={e.id} className="truncate">
                    {e.eventType.toLowerCase().replace(/_/g, " ")} ·{" "}
                    {e.createdAt.toISOString().slice(0, 10)}
                  </li>
                ))}
              </ul>
            )}
          </Link>
        </div>
      )}
    </main>
  );
}
