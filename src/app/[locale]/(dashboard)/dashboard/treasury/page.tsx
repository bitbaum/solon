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
      <p className="text-fg-secondary">
        {dbError
          ? "This cannot be loaded right now. Please try again in a minute."
          : "There is no organization here yet, so there is no money to show."}
      </p>
    );
  }

  const report = await treasuryReport(org.id);
  return <BitcoinTreasury report={report} />;
}
