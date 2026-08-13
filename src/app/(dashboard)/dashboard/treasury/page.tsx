import BitcoinTreasury from "@/components/dashboard/bitcoin-treasury";
import { prisma } from "@/lib/db";
import type { BitcoinTransaction } from "@/lib/solon/types";

const SAMPLE_TRANSACTIONS: BitcoinTransaction[] = [
  { txid: 'sample-transaction', amount_sats: '21000', category: 'operations', transaction_date: '2026-08-12T12:00:00.000Z' },
];

function SampleTreasury() {
  return (
    <div className="space-y-6">
      <BitcoinTreasury organizationId="sample-org" walletBalance={21_000n} recentTransactions={SAMPLE_TRANSACTIONS} isSample />
    </div>
  );
}

export default async function TreasuryPage() {
  try {
    const org = await prisma.organizations.findFirst({ select: { id: true } });
    if (!org) return <SampleTreasury />;
    const [txs, recordedBalance] = await Promise.all([
      prisma.bitcoin_transactions.findMany({
        where: { organization_id: org.id },
        orderBy: { transaction_date: 'desc' },
        take: 10,
      }),
      prisma.bitcoin_transactions.aggregate({
        where: { organization_id: org.id },
        _sum: { amount_sats: true },
      }),
    ]);
    const balanceSats = recordedBalance._sum.amount_sats ?? 0n;
    const recentTransactions: BitcoinTransaction[] = txs.map((transaction) => ({
      txid: transaction.txid,
      amount_sats: transaction.amount_sats.toString(),
      category: transaction.category,
      transaction_date: transaction.transaction_date.toISOString(),
    }));
    return (
      <div className="space-y-6">
        <BitcoinTreasury organizationId={org.id} walletBalance={balanceSats} recentTransactions={recentTransactions} />
      </div>
    );
  } catch {
    return <SampleTreasury />;
  }
}
