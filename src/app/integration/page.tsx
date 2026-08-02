import PageLayout from '@/components/ui/page-layout';

export default function IntegrationPage() {
  return (
    <PageLayout 
      title="API & Integration Guide" 
      description="Complete integration documentation for developers"
    >
      <div className="max-w-6xl mx-auto">
        
        {/* Quick Start */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-[var(--navy)] mb-6">Quick Start Integration</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-[var(--navy)] mb-4">REST API Example</h3>
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                <div className="text-gray-400"># Get organization treasury balance</div>
                <div className="text-white">curl -H &quot;Authorization: Bearer YOUR_API_KEY&quot; \</div>
                <div className="text-white ml-4">https://api.solon.org/v1/treasury/balance</div>
                <br />
                <div className="text-gray-400"># Response</div>
                <div className="text-green-300">{'{'}</div>
                <div className="text-green-300 ml-2">&quot;balance&quot;: &quot;2.47851234&quot;,</div>
                <div className="text-green-300 ml-2">&quot;currency&quot;: &quot;BTC&quot;,</div>
                <div className="text-green-300 ml-2">&quot;usd_value&quot;: &quot;142847.23&quot;</div>
                <div className="text-green-300">{'}'}</div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-[var(--navy)] mb-4">SDK Integration</h3>
              <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                <div className="text-gray-400">{'// JavaScript SDK'}</div>
                <div className="text-blue-300">import</div> <div className="text-white">{'{ SolonAPI }'}</div> <div className="text-blue-300">from</div> <div className="text-orange-300">&apos;@solon/sdk&apos;</div>
                <br />
                <div className="text-blue-300">const</div> <div className="text-white">client = </div><div className="text-blue-300">new</div> <div className="text-white">SolonAPI(apiKey)</div>
                <br />
                <div className="text-gray-400">{'// Get treasury data'}</div>
                <div className="text-blue-300">const</div> <div className="text-white">balance = </div><div className="text-blue-300">await</div> <div className="text-white">client.treasury.getBalance()</div>
                <div className="text-blue-300">const</div> <div className="text-white">votes = </div><div className="text-blue-300">await</div> <div className="text-white">client.voting.getActive()</div>
              </div>
            </div>
          </div>
        </div>

        {/* API Endpoints */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <APIEndpointCard
            title="Treasury API"
            description="Manage Bitcoin treasury operations"
            endpoints={[
              'GET /treasury/balance - Current Bitcoin balance',
              'GET /treasury/transactions - Transaction history', 
              'POST /treasury/proposal - Create payment proposal',
              'GET /treasury/reports - Financial reports'
            ]}
          />
          
          <APIEndpointCard
            title="Voting API"
            description="Democratic decision-making endpoints"
            endpoints={[
              'GET /voting/active - Active vote proposals',
              'POST /voting/cast - Cast cryptographic vote',
              'GET /voting/results - Vote results and audit',
              'POST /voting/propose - Create new proposal'
            ]}
          />
          
          <APIEndpointCard
            title="Governance API"
            description="Organizational governance tools"
            endpoints={[
              'GET /governance/decisions - Decision history',
              'POST /governance/decision - Record decision',
              'GET /governance/transparency - Public records',
              'GET /governance/audit - Audit trail data'
            ]}
          />
          
          <APIEndpointCard
            title="Marketplace API"
            description="Service procurement platform"
            endpoints={[
              'GET /marketplace/services - Service directory',
              'POST /marketplace/procurement - Start procurement',
              'GET /marketplace/vendors - Vendor management',
              'GET /marketplace/contracts - Contract tracking'
            ]}
          />
        </div>
      </div>
    </PageLayout>
  );
}

function APIEndpointCard({ title, description, endpoints }: {
  title: string;
  description: string;
  endpoints: string[];
}) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <h3 className="text-xl font-bold text-[var(--navy)] mb-3">{title}</h3>
      <p className="text-gray-600 mb-4">{description}</p>
      <ul className="space-y-2">
        {endpoints.map((endpoint, index) => (
          <li key={index} className="text-sm">
            <code className="bg-gray-100 px-2 py-1 rounded text-xs text-[var(--navy)] font-mono">
              {endpoint}
            </code>
          </li>
        ))}
      </ul>
    </div>
  );
}