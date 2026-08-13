'use client'

import { useState } from 'react'
import { Bitcoin, Scale, ShoppingCart, Users, CheckCircle } from 'lucide-react'

export function FourPillars() {
  const [activePillar, setActivePillar] = useState<number | null>(null)

  const pillars = [
    {
      id: 1,
      icon: Bitcoin,
      title: "Transparent Transaction System",
      shortDesc: "Traceable Bitcoin treasury records",
      description: "Connect organization treasury records with Bitcoin transaction evidence while keeping all monetary values in integer satoshis.",
      features: [
        "Address balance lookup",
        "Recorded transaction history",
        "Integer satoshi accounting",
        "Public explorer references",
        "Explicit balance source"
      ],
      color: "from-orange-400 to-yellow-400",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200",
      textColor: "text-orange-700"
    },
    {
      id: 2,
      icon: Scale,
      title: "Law Transparency Framework",
      shortDesc: "Decision records and measurable outcomes",
      description: "The data model links organizational decisions, voting sessions, origin members, and optional effectiveness indicators for later review.",
      features: [
        "Decision and session relationships",
        "Optional signature records",
        "Origin-member references",
        "Status and deadline fields",
        "Optional effectiveness data"
      ],
      color: "from-blue-400 to-indigo-400",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      textColor: "text-blue-700"
    },
    {
      id: 3,
      icon: ShoppingCart,
      title: "Procurement Data Model (Roadmap)",
      shortDesc: "Procurement schema on the roadmap",
      description: "The database schema can represent service requests and Bitcoin-denominated bids. A usable marketplace workspace is not included in this MVP.",
      features: [
        "Service request records",
        "Integer-satoshi bid amounts",
        "Evaluation criteria field",
        "Bid and request relationships",
        "Marketplace UI remains planned"
      ],
      color: "from-green-400 to-emerald-400",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      textColor: "text-green-700"
    },
    {
      id: 4,
      icon: Users,
      title: "Open Vote System",
      shortDesc: "Bitcoin signed-message verification",
      description: "A vote is stored only after its Bitcoin signature recovers to an active member address for the organization and session.",
      features: [
        "Cryptographic vote verification",
        "Active-member eligibility",
        "Session-bound messages",
        "Weighted stored tallies",
        "Duplicate-member vote upsert"
      ],
      color: "from-purple-400 to-pink-400",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200",
      textColor: "text-purple-700"
    }
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {pillars.map((pillar) => {
        const IconComponent = pillar.icon
        const isActive = activePillar === pillar.id

        return (
          <div
            key={pillar.id}
            className={`relative group transition-all duration-300 ${
              isActive ? 'z-10' : ''
            }`}
            onMouseEnter={() => setActivePillar(pillar.id)}
            onMouseLeave={() => setActivePillar(null)}
          >
            <div className={`rounded-2xl border-2 p-8 h-full transition-all duration-300 ${
              isActive
                ? `${pillar.bgColor} ${pillar.borderColor} shadow-lg`
                : 'bg-white border-gray-200 shadow-lg hover:shadow-xl'
            }`}>

              {/* Header */}
              <div className="flex items-center space-x-4 mb-6">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${pillar.color} flex items-center justify-center shadow-lg`}>
                  <IconComponent className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-1">{pillar.title}</h3>
                  <p className="text-gray-600 font-medium">{pillar.shortDesc}</p>
                </div>
              </div>

              {/* Description */}
              <p className="text-gray-700 mb-6 leading-relaxed">
                {pillar.description}
              </p>

              {/* Features */}
              <div className="space-y-3 mb-6">
                {pillar.features.map((feature, featureIndex) => (
                  <div key={featureIndex} className="flex items-center space-x-3">
                    <CheckCircle className={`w-5 h-5 flex-shrink-0 ${pillar.textColor}`} />
                    <span className="text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>

              {/* Bitcoin Integration Note */}
              <div className="absolute top-4 right-4 opacity-20 group-hover:opacity-100 transition-opacity">
                <Bitcoin className="w-6 h-6 text-orange-500" />
              </div>
            </div>
          </div>
        )
      })}

      {/* Integration Note */}
      <div className="lg:col-span-2 mt-8">
        <div className="bg-gradient-to-r from-solon-orange/10 to-solon-bitcoin/10 rounded-2xl p-8 border border-solon-orange/20">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              One Evidence Model
            </h3>
            <p className="text-lg text-gray-600 mb-6 max-w-4xl mx-auto">
              Solon&apos;s current MVP connects treasury records, members, decisions, and votes in one relational model.
              Bitcoin provides external transaction evidence and signed-message authorization where those integrations are implemented.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <div className="text-center">
                <div className="w-12 h-12 bg-solon-orange rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-white font-bold text-lg">1</span>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Traceable</h4>
                <p className="text-gray-600 text-sm">Records retain organization and member context</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-solon-orange rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-white font-bold text-lg">2</span>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Precise</h4>
                <p className="text-gray-600 text-sm">Treasury values remain integer satoshis</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-solon-orange rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-white font-bold text-lg">3</span>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Verifiable</h4>
                <p className="text-gray-600 text-sm">Signed votes bind choice, session, and address</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
