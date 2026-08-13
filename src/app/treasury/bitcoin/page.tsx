import PageLayout from '@/components/ui/page-layout';
import Link from 'next/link';
import { ROUTES } from '@/lib/site-config';

export default function BitcoinTreasuryPage() {
  return (
    <PageLayout 
      title="Bitcoin Treasury Management" 
      description="Explore an illustrative treasury, then open the implemented organization workspace"
    >
      <div className="max-w-6xl mx-auto">
        
        {/* Illustrative walkthrough */}
        <div className="mb-8 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-8">
          <p className="text-sm font-bold uppercase tracking-wider text-solon-orange">Illustrative sample data</p>
          <h2 className="mb-6 mt-1 text-2xl font-bold text-navy">Treasury walkthrough</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-lg border border-orange-200">
              <h3 className="font-semibold text-orange-900 mb-2">Current Balance</h3>
              <div className="text-3xl font-bold text-orange-600">₿ 2.47851234</div>
              <div className="text-sm text-orange-700 mt-1">Sample organization balance</div>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
              <h3 className="font-semibold text-green-900 mb-2">This Month</h3>
              <div className="text-3xl font-bold text-green-600">₿ 0.15420000</div>
              <div className="text-sm text-green-700 mt-1">Sample incoming total</div>
            </div>
            
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-2">Pending Votes</h3>
              <div className="text-3xl font-bold text-blue-600">3</div>
              <div className="text-sm text-blue-700 mt-1">Treasury proposals active</div>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-[var(--navy)] mb-4">Recent Transactions</h3>
            <div className="space-y-3">
              <TransactionRow
                type="received"
                amount="₿ 0.05000000"
                description="Monthly funding from donors"
                timestamp="2 hours ago"
                txId="bc1q...7a8f"
              />
              <TransactionRow
                type="sent"
                amount="₿ 0.01250000"
                description="Development team payment"
                timestamp="1 day ago"
                txId="bc1q...9b2c"
              />
              <TransactionRow
                type="received"
                amount="₿ 0.10000000"
                description="Grant funding approved"
                timestamp="3 days ago"
                txId="bc1q...4d5e"
              />
            </div>
          </div>

          {/* Interactive Demo */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-[var(--navy)] mb-4">Try It Yourself</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link href={ROUTES.dashboardTreasury} className="flex min-h-11 items-center justify-center rounded-lg bg-navy px-6 py-3 text-center font-medium text-white transition-colors hover:bg-navy-light">
                Open Treasury Workspace
              </Link>
              <Link href={ROUTES.votingDemo} className="flex min-h-11 items-center justify-center rounded-lg border border-navy px-6 py-3 text-center font-medium text-navy transition-colors hover:bg-slate-50">
                Review Treasury Votes
              </Link>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-xl font-bold text-[var(--navy)] mb-4">External Custody by Design</h3>
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start">
                <div className="w-2 h-2 rounded-full bg-[var(--navy)] mr-3 mt-2 flex-shrink-0"></div>
                <span>Solon does not ask for private keys</span>
              </li>
              <li className="flex items-start">
                <div className="w-2 h-2 rounded-full bg-[var(--navy)] mr-3 mt-2 flex-shrink-0"></div>
                <span>Organization wallet address or xpub configuration</span>
              </li>
              <li className="flex items-start">
                <div className="w-2 h-2 rounded-full bg-[var(--navy)] mr-3 mt-2 flex-shrink-0"></div>
                <span>Transaction records use integer satoshis</span>
              </li>
            </ul>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-xl font-bold text-[var(--navy)] mb-4">Inspectable Records</h3>
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start">
                <div className="w-2 h-2 rounded-full bg-[var(--navy)] mr-3 mt-2 flex-shrink-0"></div>
                <span>Transaction IDs can link to a public explorer</span>
              </li>
              <li className="flex items-start">
                <div className="w-2 h-2 rounded-full bg-[var(--navy)] mr-3 mt-2 flex-shrink-0"></div>
                <span>Net total calculated from signed recorded amounts</span>
              </li>
              <li className="flex items-start">
                <div className="w-2 h-2 rounded-full bg-[var(--navy)] mr-3 mt-2 flex-shrink-0"></div>
                <span>Recorded transaction and budget summaries</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

function TransactionRow({ type, amount, description, timestamp, txId }: {
  type: 'sent' | 'received';
  amount: string;
  description: string;
  timestamp: string;
  txId: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center space-x-4">
        <div className={`w-3 h-3 rounded-full ${type === 'received' ? 'bg-green-500' : 'bg-red-500'}`}></div>
        <div>
          <div className="font-medium text-gray-900">{description}</div>
          <div className="text-sm text-gray-500">{timestamp} • {txId}</div>
        </div>
      </div>
      <div className={`font-mono font-semibold sm:text-right ${type === 'received' ? 'text-green-700' : 'text-red-700'}`}>
        {type === 'received' ? '+' : '-'}{amount}
      </div>
    </div>
  );
}
