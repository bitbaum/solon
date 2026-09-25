import SolonHero from "@/components/marketing/solon-hero";
import { FourPillars } from "@/components/marketing/four-pillars";

export default function Home() {
  return (
    <main>
      {/* Hero — full-bleed backdrop, same treatment as the other two products'
          public pages. Sections own their width; the root layout has no container. */}
      <SolonHero />

      {/* Four Pillars — the one strong statement, then the deep dive */}
      <section id="pillars" className="section-shell py-section">
        <div className="mx-auto max-w-lede text-center">
          <h2 className="font-display text-display-2 text-fg-primary">What Solon Governs</h2>
          <p className="mt-6 text-lg text-fg-secondary">
            Treasury, voting, decisions, and audit — designed as one system, with every claim
            verifiable against the running platform.
          </p>
        </div>
        <div className="mt-20">
          <FourPillars />
        </div>
      </section>

      {/* Closing call to action */}
      <section className="public-backdrop border-t border-subtle">
        <div className="section-shell py-section text-center">
          <h2 className="font-display text-display-2 text-fg-primary">Govern in the open</h2>
          <p className="mx-auto mt-6 max-w-lede text-lg text-fg-secondary">
            Every decision and every vote — recorded in public, and labelled with exactly what
            proves it.
          </p>
          <div className="mt-11 flex flex-col justify-center gap-3 sm:flex-row">
            <a
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-control bg-accent px-6 py-3 font-semibold text-on-accent transition-colors hover:bg-accent-hover"
            >
              Open the Dashboard
            </a>
            <a
              href="/features"
              className="inline-flex items-center justify-center rounded-control border border-default bg-surface-base px-6 py-3 font-semibold text-fg-primary transition-colors hover:bg-surface-raised"
            >
              See the features
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
