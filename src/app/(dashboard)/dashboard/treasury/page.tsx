import BitcoinTreasury from "@/components/dashboard/bitcoin-treasury";
import { treasuryReport } from "@/lib/domain/treasury";
import { primaryOrg } from "@/lib/domain/org";

export const dynamic = "force-dynamic";

export default async function TreasuryPage() {
  let org = null;
  let dbError = false;
  try {
    org = (await primaryOrg()) ?? null;
  } catch {
    dbError = true;
  }

  if (dbError || !org) {
    return (
      <main className="space-y-6">
        <h1 className="font-display text-display-3">Treasury</h1>
        <p className="text-fg-secondary">
          {dbError
            ? "The treasury register is currently unreachable. No balance can be shown."
            : "No organization is registered yet, so there is no treasury to show."}
        </p>
      </main>
    );
  }

  const report = await treasuryReport(org.id);
  return (
    <main className="space-y-6">
      <BitcoinTreasury orgName={org.name} report={report} />
    </main>
  );
}
