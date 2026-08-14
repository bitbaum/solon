import en from "@/i18n/en.json";
import de from "@/i18n/de.json";
import fr from "@/i18n/fr.json";
import it from "@/i18n/it.json";
import { Check } from "lucide-react";
import { HERO_CTAS } from "@/lib/site-config";

type Lang = "en" | "de" | "fr" | "it";

const dict: Record<Lang, any> = { en, de, fr, it };

export interface SolonHeroProps {
  language: Lang;
}

/**
 * The hero states the message once and sends visitors to real destinations.
 * No badges claiming states the product isn't in; the pillar detail lives in
 * the section below, not duplicated here.
 */
export default function SolonHero({ language }: SolonHeroProps) {
  const t = dict[language]?.solon ?? dict.en.solon;

  const bullets = [
    t.bullets?.transparency,
    t.bullets?.democracy,
    t.bullets?.global,
  ];

  return (
    <section className="solon-hero-navy rounded-md overflow-hidden">
      <div className="px-6 sm:px-10 lg:px-16 py-16 sm:py-20">
        <div className="max-w-3xl mx-auto">
          <div className="text-center">
            <h1 className="font-display text-5xl sm:text-6xl font-bold tracking-tight text-white">
              {t.title}
            </h1>
            <p className="mt-5 text-xl text-on-brand-muted">{t.tagline}</p>
            <p className="mt-2 text-on-brand-muted">{t.subtag}</p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                className="inline-flex items-center justify-center rounded-sm bg-solon-orange px-6 py-3 font-semibold text-white transition hover:bg-solon-orange-dark"
                href={HERO_CTAS.primary.href}
              >
                {t.cta_primary}
              </a>
              <a
                className="inline-flex items-center justify-center rounded-sm bg-on-brand/10 px-6 py-3 font-semibold text-white ring-1 ring-on-brand/20 transition hover:bg-on-brand/20"
                href={HERO_CTAS.secondary.href}
              >
                {t.cta_secondary}
              </a>
            </div>

            {/* Bullets — the core claims, each one true of the running system */}
            <ul className="mt-8 grid sm:grid-cols-3 gap-x-8 gap-y-3 text-left text-on-brand-muted">
              {bullets.filter(Boolean).map((b: string) => (
                <li key={b} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-solon-bitcoin" />
                  <span className="text-sm">{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
