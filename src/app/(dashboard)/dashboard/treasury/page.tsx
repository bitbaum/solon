import BitcoinTreasury from "@/components/dashboard/bitcoin-treasury";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function TreasuryPage() {
  let org = null;
  let txs: Awaited<ReturnType<typeof prisma.bitcoin_transactions.findMany>> = [];
  let dbError = false;
  try {
    org = await prisma.organizations.findFirst();
    if (org) {
      txs = await prisma.bitcoin_transactions.findMany({
        where: { organization_id: org.id },
        orderBy: { transaction_date: "desc" },
        take: 10,
      });
    }
  } catch {
    dbError = true;
  }

  if (dbError || !org) {
    return (
      <main className="space-y-6">
        <h1 className="text-3xl font-bold">Treasury</h1>
        <p className="text-gray-300">
          {dbError
            ? "The treasury register is currently unreachable. No balance can be shown."
            : "No organization is registered yet, so there is no treasury to show."}
        </p>
      </main>
    );
  }

  const balanceSats = txs.reduce((acc, t) => acc + Number(t.amount_sats), 0);
  return (
    <main className="space-y-6">
      <BitcoinTreasury
        organizationId={org.id}
        walletBalance={balanceSats}
        recentTransactions={txs.map((t) => ({
          ...t,
          amount_sats: Number(t.amount_sats),
          transaction_date:
            t.transaction_date instanceof Date
              ? t.transaction_date.toISOString()
              : String(t.transaction_date),
          description: t.description ?? undefined,
          to_address: t.to_address ?? undefined,
          from_address: t.from_address ?? undefined,
        }))}
      />
    </main>
  );
}
