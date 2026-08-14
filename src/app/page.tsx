import SolonHero from "@/components/marketing/solon-hero";
import { FourPillars } from "@/components/marketing/four-pillars";
import en from "@/i18n/en.json";

export default function Home() {
  const t = en.home;

  return (
    <main>
      {/* Hero — full-bleed backdrop, same treatment as the other two products'
          public pages. Sections own their width; the root layout has no container. */}
      <SolonHero language="en" />

      {/* Four Pillars — the one strong statement, then the deep dive */}
      <section id="pillars" className="section-shell py-section">
        <div className="mx-auto max-w-lede text-center">
          <h2 className="font-display text-display-2 font-bold tracking-display text-fg-primary">
            {t.pillars_section.title}
          </h2>
          <p className="mt-6 text-lg text-fg-secondary">
            {t.pillars_section.subtitle}
          </p>
        </div>
        <div className="mt-20">
          <FourPillars />
        </div>
      </section>

      {/* Closing call to action */}
      <section className="public-backdrop border-t border-subtle">
        <div className="section-shell py-section text-center">
          <h2 className="font-display text-display-2 font-bold tracking-display text-fg-primary">
            {t.cta.title}
          </h2>
          <p className="mx-auto mt-6 max-w-lede text-lg text-fg-secondary">
            {t.cta.subtitle}
          </p>
          <div className="mt-11 flex flex-col justify-center gap-3 sm:flex-row">
            <a
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-control bg-accent px-6 py-3 font-semibold text-white transition-colors hover:bg-accent-hover"
            >
              {t.cta.primary}
            </a>
            <a
              href="/features"
              className="inline-flex items-center justify-center rounded-control border border-default bg-surface-base px-6 py-3 font-semibold text-fg-primary transition-colors hover:bg-surface-raised"
            >
              {t.cta.secondary}
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
