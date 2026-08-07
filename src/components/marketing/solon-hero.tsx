"use client";
import en from "@/i18n/en.json";
import de from "@/i18n/de.json";
import fr from "@/i18n/fr.json";
import it from "@/i18n/it.json";
import {
  Bitcoin,
  Scale,
  ShoppingCart,
  Users,
  Check,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

type Lang = "en" | "de" | "fr" | "it";

const dict: Record<Lang, any> = { en, de, fr, it };

export interface SolonHeroProps {
  language: Lang;
}

export default function SolonHero({ language }: SolonHeroProps) {
  const t = dict[language]?.solon ?? dict.en.solon;

  const pillars: { icon: LucideIcon; title: string; desc: string }[] = [
    { icon: Bitcoin, title: t.pillars.transactions, desc: t.pillar_desc.transactions },
    { icon: Scale, title: t.pillars.decisions, desc: t.pillar_desc.decisions },
    { icon: ShoppingCart, title: t.pillars.marketplace, desc: t.pillar_desc.marketplace },
    { icon: Users, title: t.pillars.voting, desc: t.pillar_desc.voting },
  ];

  const bullets = [t.bullets?.transparency, t.bullets?.democracy, t.bullets?.market, t.bullets?.global];

  return (
    <section className="solon-hero-navy rounded-xl shadow-navy overflow-hidden">
      <div className="px-6 sm:px-10 lg:px-16 py-16 sm:py-20">
        <div className="max-w-3xl mx-auto">
          {/* Message + CTAs */}
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-md bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-solon-bitcoin ring-1 ring-white/15">
              <ShieldCheck className="h-3.5 w-3.5" />
              {t.ledger.verified}
            </span>
            <h1 className="font-display mt-5 text-5xl sm:text-6xl font-bold tracking-tight text-white">
              {t.title}
            </h1>
            <p className="mt-5 text-xl text-slate-200">{t.tagline}</p>
            <p className="mt-2 text-slate-400">{t.subtag}</p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                className="inline-flex items-center justify-center rounded-sm bg-solon-orange px-6 py-3 font-semibold text-white shadow-card transition hover:bg-solon-orange-dark"
                href="/dashboard/treasury"
              >
                {t.cta_primary}
              </a>
              <a
                className="inline-flex items-center justify-center rounded-sm bg-white/10 px-6 py-3 font-semibold text-white ring-1 ring-white/20 transition hover:bg-white/20"
                href="/dashboard/voting"
              >
                {t.cta_secondary}
              </a>
            </div>

            {/* Bullets — the core claims, compact */}
            <ul className="mt-8 grid sm:grid-cols-2 gap-x-8 gap-y-3 text-left text-slate-200">
              {bullets.filter(Boolean).map((b: string) => (
                <li key={b} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-solon-bitcoin" />
                  <span className="text-sm">{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Pillar strip — four governance pillars with real icons */}
        <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {pillars.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-lg bg-white/[0.05] p-5 ring-1 ring-white/10 transition hover:bg-white/[0.08]"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-md bg-solon-bitcoin/15">
                <Icon className="h-5 w-5 text-solon-bitcoin" />
              </span>
              <div className="mt-4 font-display font-semibold text-white">{title}</div>
              <div className="mt-1 text-sm text-slate-400">{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
