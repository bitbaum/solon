import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAddressBalance } from '@/lib/bitcoin/mempool';
import { serializeBitcoinTransaction } from '@/lib/bitcoin/wallet-utils';

type RouteContext = { params: { orgId: string } };

export async function GET(_: Request, { params }: RouteContext) {
  try {
    const organization = await prisma.organizations.findUnique({ where: { id: params.orgId } });
    if (!organization) {
      return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 });
    }

    const [transactions, recordedBalance] = await Promise.all([
      prisma.bitcoin_transactions.findMany({
        where: { organization_id: params.orgId },
        orderBy: { transaction_date: 'desc' },
        take: 25,
      }),
      prisma.bitcoin_transactions.aggregate({
        where: { organization_id: params.orgId },
        _sum: { amount_sats: true },
      }),
    ]);

    const treasuryAddress = organization.bitcoin_wallet_xpub;
    let balanceSats = recordedBalance._sum.amount_sats ?? 0n;
    let balanceSource: 'onchain' | 'recorded-net-total' = 'recorded-net-total';

    if (/^(bc1|[13])[a-zA-HJ-NP-Z0-9]{20,}$/.test(treasuryAddress)) {
      try {
        const balance = await getAddressBalance(treasuryAddress);
        balanceSats = BigInt(balance.total_sats);
        balanceSource = 'onchain';
      } catch {
        // The recorded total remains an explicit, deterministic fallback.
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        treasury_address: treasuryAddress,
        balance_sats: balanceSats.toString(),
        balance_source: balanceSource,
        transactions: transactions.map(serializeBitcoinTransaction),
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: 'Unable to load treasury data' }, { status: 500 });
  }
}
