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
    <section className="public-backdrop border-b border-subtle">
      <div className="section-shell py-20 sm:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="eyebrow">{t.title}</p>

          {/* The headline is the proposition, not the brand name — the wordmark
              is already in the nav, exactly as on OrangeCat and FleetCrown. */}
          <h1 className="mx-auto mt-6 max-w-2xl font-display text-4xl leading-[1.08] text-fg-primary sm:text-5xl lg:text-6xl">
            {t.tagline}
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-fg-secondary">
            {t.subtag}
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              className="inline-flex w-full items-center justify-center rounded-control bg-accent px-6 py-3 font-semibold text-white transition-colors hover:bg-accent-hover sm:w-auto"
              href={HERO_CTAS.primary.href}
            >
              {t.cta_primary}
            </a>
            <a
              className="inline-flex w-full items-center justify-center rounded-control border border-default bg-surface-base px-6 py-3 font-semibold text-fg-primary transition-colors hover:bg-surface-raised sm:w-auto"
              href={HERO_CTAS.secondary.href}
            >
              {t.cta_secondary}
            </a>
          </div>

          {/* Bullets — the core claims, each one true of the running system */}
          <ul className="mx-auto mt-12 grid gap-x-8 gap-y-3 text-left sm:grid-cols-3">
            {bullets.filter(Boolean).map((b: string) => (
              <li key={b} className="flex items-start gap-2.5">
                <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" />
                <span className="text-sm text-fg-secondary">{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
