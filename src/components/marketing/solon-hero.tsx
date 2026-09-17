import { Check } from "lucide-react";
import { HERO_CTAS } from "@/lib/site-config";

/**
 * The hero states the message once and sends visitors to real destinations.
 * No badges claiming states the product isn't in; the pillar detail lives in
 * the section below, not duplicated here.
 *
 * The copy is English, in the component, like every other page in this repo.
 * It used to read a four-language dictionary — see AGENTS.md, "Language",
 * for why that went and what would bring it back.
 */
const BULLETS = [
  "Watch-only treasuries — Solon holds no keys, no funds",
  "Bitcoin-signed votes anyone can re-verify",
  "Append-only audit trail, public by default",
];

export default function SolonHero() {
  return (
    <section className="public-backdrop border-b border-subtle">
      <div className="section-shell py-section">
        <div className="mx-auto max-w-5xl text-center">
          <p className="eyebrow">SOLON</p>

          {/* The headline is the proposition, not the brand name — the wordmark
              is already in the nav, exactly as on OrangeCat and Loki.
              The column above is what holds it to two lines at desktop; giving
              the h1 its own max-width as well just adds a rule that never binds.
              No weight or tracking here: .font-display owns both, because the
              display face has exactly one weight. */}
          <h1 className="mx-auto mt-8 font-display text-display-1 text-fg-primary">
            Bitcoin-Native Governance for the Digital Age
          </h1>
          <p className="mx-auto mt-7 max-w-lede text-lg text-fg-secondary">
            Transparent decision-making and treasuries for organizations of humans and AI agents.
          </p>

          <div className="mt-11 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              className="inline-flex w-full items-center justify-center rounded-control bg-accent px-6 py-3 font-semibold text-on-accent transition-colors hover:bg-accent-hover sm:w-auto"
              href={HERO_CTAS.primary.href}
            >
              See the latest vote
            </a>
            <a
              className="inline-flex w-full items-center justify-center rounded-control border border-default bg-surface-base px-6 py-3 font-semibold text-fg-primary transition-colors hover:bg-surface-raised sm:w-auto"
              href={HERO_CTAS.secondary.href}
            >
              See the treasury
            </a>
          </div>

          {/* Bullets — the core claims, each one true of the running system */}
          <ul className="mx-auto mt-16 grid gap-x-10 gap-y-4 text-left sm:grid-cols-3">
            {BULLETS.map((b) => (
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
