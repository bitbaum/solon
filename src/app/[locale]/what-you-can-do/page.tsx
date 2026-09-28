import { Link } from "@/i18n/navigation";
import PageLayout from "@/components/ui/page-layout";
import TheDoor from "@/components/site/the-door";
import { CAPABILITY_MAP_PAGE, SOLON_CAPABILITIES } from "@/lib/config/capabilities";

export const metadata = { title: `${CAPABILITY_MAP_PAGE.title} — Solon` };

/**
 * The map: every capability in plain words with a start. Public on purpose —
 * the person who most needs it has no seat yet.
 */
export default function WhatYouCanDoPage() {
  return (
    <PageLayout title={CAPABILITY_MAP_PAGE.title} description={CAPABILITY_MAP_PAGE.lede}>
      <TheDoor className="mx-auto mt-10 max-w-2xl" />
      <ul className="mx-auto mt-12 grid max-w-5xl gap-4 md:grid-cols-2">
        {SOLON_CAPABILITIES.map((c) => (
          <li
            key={c.id}
            className="flex flex-col rounded-surface border border-default bg-surface-base p-5"
          >
            <h2 className="headline text-xl text-fg-primary">{c.verb}</h2>
            <p className="mt-1 text-sm leading-relaxed text-fg-secondary">{c.what}</p>
            <p className="mt-3 text-sm text-fg-tertiary">
              <span className="text-fg-tertiary">For example: </span>
              {c.example}
            </p>
            <ol className="mt-3 space-y-1 text-sm text-fg-secondary">
              {c.steps.map((step, i) => (
                <li key={step} className="flex gap-2">
                  <span className="w-4 shrink-0 tabular-nums text-fg-tertiary">{i + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <div className="mt-4 pt-1">
              <Link
                href={c.startHref}
                className="text-sm font-semibold text-fg-primary hover:underline"
              >
                Start &rarr;
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </PageLayout>
  );
}
