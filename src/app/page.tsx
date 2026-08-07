import SolonHero from '@/components/marketing/solon-hero'
import { FourPillars } from '@/components/marketing/four-pillars'
import en from '@/i18n/en.json'

export default function Home() {
  const t = en.home

  return (
    <div className="min-h-screen">

      {/* Hero — navy anchor with live treasury ledger + icon pillars */}
      <section className="pt-8 pb-4">
        <SolonHero language="en" />
      </section>

      {/* Four Pillars — the one strong statement, then the deep dive */}
      <section id="pillars" className="py-20">
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-navy mb-4">
            {t.pillars_section.title}
          </h2>
          <p className="text-lg text-slate-600 max-w-3xl mx-auto">
            {t.pillars_section.subtitle}
          </p>
        </div>
        <FourPillars />
      </section>

      {/* Call to Action — navy anchor closes the page */}
      <section className="my-20 solon-hero-navy rounded-xl shadow-navy">
        <div className="max-w-4xl mx-auto px-6 sm:px-10 py-20 text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-6">
            {t.cta.title}
          </h2>
          <p className="text-lg text-slate-300 mb-8">
            {t.cta.subtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/dashboard"
              className="inline-flex items-center justify-center bg-solon-orange text-white px-8 py-3 rounded-sm hover:bg-solon-orange-dark transition-colors font-semibold shadow-card"
            >
              {t.cta.primary}
            </a>
            <a
              href="/features"
              className="inline-flex items-center justify-center bg-white/10 text-white px-8 py-3 rounded-sm ring-1 ring-white/20 hover:bg-white/20 transition-colors font-semibold"
            >
              {t.cta.secondary}
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
