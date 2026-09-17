import Link from "next/link";

export interface TrailStop {
  href: string;
  title: string;
  blurb: string;
  /** What kind of thing is at the other end, so a click is never a surprise. */
  kind?: "read" | "try" | "record" | "do";
}

const KIND_LABEL: Record<NonNullable<TrailStop["kind"]>, string> = {
  read: "Read",
  try: "Try it",
  record: "The record",
  do: "Do it",
};

/**
 * Where to go next. Every page in this section ends with one.
 *
 * A teaching section that only goes forward is a manual; one where every page
 * opens three others is somewhere you can get lost on purpose, which is the
 * point. The `kind` label is there so a reader knows whether the next stop is
 * more reading, something to play with, or the live record — nobody rabbit-holes
 * into links they cannot predict.
 */
export function Trail({ stops, title = "Keep going" }: { stops: TrailStop[]; title?: string }) {
  return (
    <nav aria-label={title} className="border-t border-default pt-10">
      <h2 className="font-display text-2xl text-fg-primary">{title}</h2>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stops.map((stop) => (
          <li key={stop.href}>
            <Link
              href={stop.href}
              className="group flex h-full flex-col rounded-control border border-default bg-surface-base p-5 transition-colors hover:border-interactive hover:bg-surface-raised"
            >
              {stop.kind && (
                <span className="font-mono text-xs uppercase tracking-caps text-accent-text">
                  {KIND_LABEL[stop.kind]}
                </span>
              )}
              <span className="mt-2 font-semibold text-fg-primary">{stop.title}</span>
              <span className="mt-2 text-sm leading-relaxed text-fg-secondary">{stop.blurb}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
