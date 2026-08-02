'use client'

import { useState, useEffect } from 'react'
import { Bitcoin, Users, Scale, ShoppingCart, Eye, TrendingUp, Clock, Check, X, MinusCircle, type LucideIcon } from 'lucide-react'

interface DemoTransaction {
  id: string
  amount: string
  category: string
  to: string
  time: string
  confirmations: number
}

interface Decision {
  id: string
  title: string
  status: string
  votes: { yes: number; no: number; abstain: number }
  deadline: string
  effectiveness: number | null
}

interface ServiceRequest {
  id: string
  title: string
  budget: string
  bids: number
  status: string
  deadline: string
}

interface VotingSession {
  id: string
  question: string
  type: string
  participants: number
  votes: number
  timeLeft: string
  progress: number
}

interface DemoData {
  title: string
  icon: LucideIcon
  color: string
  bgColor: string
  borderColor: string
  transactions?: DemoTransaction[]
  decisions?: Decision[]
  services?: ServiceRequest[]
  sessions?: VotingSession[]
}

export function TransparencyDemo() {
  const [activeTab, setActiveTab] = useState('treasury')
  const [liveStats, setLiveStats] = useState({
    totalTransactions: 15420,
    activeOrganizations: 247,
    totalVotes: 8934,
    transparencyScore: 98.7
  })

  // Simulate live data updates
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveStats(prev => ({
        totalTransactions: prev.totalTransactions + Math.floor(Math.random() * 3),
        activeOrganizations: prev.activeOrganizations + Math.floor(Math.random() * 2),
        totalVotes: prev.totalVotes + Math.floor(Math.random() * 5),
        transparencyScore: Math.min(100, prev.transparencyScore + (Math.random() - 0.5) * 0.1)
      }))
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  const demoData: Record<string, DemoData> = {
    treasury: {
      title: "Bitcoin Treasury",
      icon: Bitcoin,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200",
      transactions: [
        {
          id: "tx_001",
          amount: "0.125 BTC",
          category: "Office Supplies",
          to: "bc1q...wxyz",
          time: "2 minutes ago",
          confirmations: 3
        },
        {
          id: "tx_002",
          amount: "2.5 BTC",
          category: "Service Payment",
          to: "bc1p...abcd",
          time: "15 minutes ago",
          confirmations: 12
        },
        {
          id: "tx_003",
          amount: "0.05 BTC",
          category: "Software License",
          to: "bc1q...efgh",
          time: "1 hour ago",
          confirmations: 67
        }
      ]
    },
    decisions: {
      title: "Decision Tracking",
      icon: Scale,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      decisions: [
        {
          id: "dec_001",
          title: "Q4 Budget Allocation",
          status: "Voting",
          votes: { yes: 45, no: 12, abstain: 3 },
          deadline: "2 hours",
          effectiveness: 87
        },
        {
          id: "dec_002",
          title: "New Office Policy",
          status: "Approved",
          votes: { yes: 52, no: 8, abstain: 0 },
          deadline: "Completed",
          effectiveness: 94
        },
        {
          id: "dec_003",
          title: "Vendor Selection",
          status: "Proposed",
          votes: { yes: 0, no: 0, abstain: 0 },
          deadline: "3 days",
          effectiveness: null
        }
      ]
    },
    marketplace: {
      title: "Service Marketplace",
      icon: ShoppingCart,
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      services: [
        {
          id: "svc_001",
          title: "Legal Consultation - 2 hours",
          budget: "1.0 BTC",
          bids: 8,
          status: "Bidding",
          deadline: "1 day"
        },
        {
          id: "svc_002",
          title: "Website Development",
          budget: "5.5 BTC",
          bids: 12,
          status: "Awarded",
          deadline: "Completed"
        },
        {
          id: "svc_003",
          title: "Marketing Campaign",
          budget: "3.2 BTC",
          bids: 5,
          status: "Open",
          deadline: "5 days"
        }
      ]
    },
    voting: {
      title: "Live Voting",
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200",
      sessions: [
        {
          id: "vote_001",
          question: "Should we adopt remote work policy?",
          type: "Majority",
          participants: 67,
          votes: 45,
          timeLeft: "4 hours",
          progress: 67
        },
        {
          id: "vote_002",
          question: "Budget increase for marketing",
          type: "Consensus",
          participants: 34,
          votes: 34,
          timeLeft: "1 day",
          progress: 100
        }
      ]
    }
  }

  const activeDemo = demoData[activeTab as keyof typeof demoData]

  return (
    <div className="max-w-6xl mx-auto">
      {/* Live Stats Header */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 text-center">
          <div className="text-2xl font-bold text-solon-orange mb-1">
            {liveStats.totalTransactions.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">Total Transactions</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 text-center">
          <div className="text-2xl font-bold text-solon-blue mb-1">
            {liveStats.activeOrganizations}
          </div>
          <div className="text-sm text-gray-600">Active Organizations</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 text-center">
          <div className="text-2xl font-bold text-solon-green mb-1">
            {liveStats.totalVotes.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">Total Votes</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 text-center">
          <div className="text-2xl font-bold text-solon-bitcoin mb-1">
            {liveStats.transparencyScore.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-600">Transparency Score</div>
        </div>
      </div>

      {/* Demo Tabs */}
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="border-b border-gray-200">
          <div className="flex">
            {Object.entries(demoData).map(([key, data]) => {
              const IconComponent = data.icon
              const isActive = activeTab === key

              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
                    isActive
                      ? `${data.bgColor} ${data.borderColor} border-b-2 text-gray-900`
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <IconComponent className={`w-5 h-5 ${data.color}`} />
                    <span>{data.title}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Demo Content */}
        <div className="p-8">
          <div className="flex items-center space-x-3 mb-6">
            <activeDemo.icon className={`w-8 h-8 ${activeDemo.color}`} />
            <h3 className="text-2xl font-bold text-gray-900">{activeDemo.title} Live Demo</h3>
            <div className="flex items-center space-x-2 text-sm text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="font-medium">Live</span>
            </div>
          </div>

          {/* Content based on active tab */}
          {activeTab === 'treasury' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-lg font-semibold text-gray-900">Recent Transactions</h4>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Eye className="w-4 h-4" />
                  <span>Public Ledger</span>
                </div>
              </div>
              {(activeDemo as any).transactions?.map((tx: any) => (
                <div key={tx.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                      <Bitcoin className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{tx.amount}</div>
                      <div className="text-sm text-gray-600">{tx.category}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">{tx.time}</div>
                    <div className="text-xs text-green-600">{tx.confirmations} confirmations</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'decisions' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-lg font-semibold text-gray-900">Active Decisions</h4>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Scale className="w-4 h-4" />
                  <span>KPIs Tracked</span>
                </div>
              </div>
              {(activeDemo as any).decisions?.map((decision: any) => (
                <div key={decision.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h5 className="font-semibold text-gray-900">{decision.title}</h5>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          decision.status === 'Approved' ? 'bg-green-100 text-green-800' :
                          decision.status === 'Voting' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {decision.status}
                        </span>
                        <span className="text-sm text-gray-600">{decision.deadline}</span>
                      </div>
                    </div>
                    {decision.effectiveness && (
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">
                          {decision.effectiveness}% Effective
                        </div>
                        <div className="w-20 h-2 bg-gray-200 rounded-full mt-1">
                          <div
                            className="h-2 bg-blue-500 rounded-full"
                            style={{ width: `${decision.effectiveness}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex space-x-4 text-sm">
                    <span className="inline-flex items-center gap-1 text-green-600"><Check className="h-4 w-4" /> {decision.votes.yes}</span>
                    <span className="inline-flex items-center gap-1 text-red-600"><X className="h-4 w-4" /> {decision.votes.no}</span>
                    <span className="inline-flex items-center gap-1 text-gray-600"><MinusCircle className="h-4 w-4" /> {decision.votes.abstain}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'marketplace' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-lg font-semibold text-gray-900">Open Service Requests</h4>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <ShoppingCart className="w-4 h-4" />
                  <span>Bitcoin Payments</span>
                </div>
              </div>
              {(activeDemo as any).services?.map((service: any) => (
                <div key={service.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h5 className="font-semibold text-gray-900">{service.title}</h5>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className="text-sm text-orange-600 font-medium">{service.budget}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          service.status === 'Awarded' ? 'bg-green-100 text-green-800' :
                          service.status === 'Bidding' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {service.status}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">{service.bids} bids</div>
                      <div className="text-xs text-gray-600">Due: {service.deadline}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'voting' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-lg font-semibold text-gray-900">Active Voting Sessions</h4>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Users className="w-4 h-4" />
                  <span>Cryptographic</span>
                </div>
              </div>
              {(activeDemo as any).sessions?.map((session: any) => (
                <div key={session.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h5 className="font-semibold text-gray-900 mb-2">{session.question}</h5>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>{session.type} Vote</span>
                        <span>{session.participants} participants</span>
                        <span className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>{session.timeLeft} left</span>
                        </span>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-2xl font-bold text-purple-600">{session.progress}%</div>
                      <div className="text-sm text-gray-600">{session.votes}/{session.participants} voted</div>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full transition-all duration-1000"
                      style={{ width: `${session.progress}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Transparency Badge */}
      <div className="mt-8 text-center">
        <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-solon-orange/10 to-solon-bitcoin/10 px-6 py-3 rounded-full border border-solon-orange/20">
          <Eye className="w-5 h-5 text-solon-orange" />
          <span className="font-semibold text-gray-900">Every action is publicly auditable on Bitcoin</span>
          <TrendingUp className="w-5 h-5 text-solon-green" />
        </div>
      </div>
    </div>
  )
}
