import type { ReactNode } from "react";

/**
 * The frame every diagram in /governance sits in.
 *
 * One frame, used everywhere, is what lets a reader skim the section by its
 * pictures and know where each one starts and stops. The caption is not
 * decoration: a figure that needs the surrounding paragraph to make sense has
 * not earned its space, and writing the caption is how you find that out.
 *
 * Hierarchy here is border + type, never a shadow — the house rule, and the
 * reason these read as plates in a book rather than cards in an app.
 */
export function Figure({
  label,
  title,
  caption,
  children,
  source,
}: {
  /** Short index, e.g. "Figure 2". Lets the prose point at it. */
  label: string;
  title: string;
  caption?: ReactNode;
  children: ReactNode;
  /** Where the numbers come from. Shown verbatim — usually a path in this repo. */
  source?: string;
}) {
  return (
    <figure className="rounded-surface border border-default bg-surface-base">
      <figcaption className="border-b border-subtle px-5 py-4 sm:px-7">
        <span className="font-mono text-xs uppercase tracking-caps text-accent-text">{label}</span>
        <h3 className="mt-2 font-display text-2xl text-fg-primary">{title}</h3>
        {caption && (
          <p className="mt-2 max-w-copy text-sm leading-relaxed text-fg-secondary">{caption}</p>
        )}
      </figcaption>
      <div className="px-5 py-6 sm:px-7 sm:py-7">{children}</div>
      {source && (
        <p className="border-t border-subtle px-5 py-3 font-mono text-xs text-fg-muted sm:px-7">
          Computed by {source}
        </p>
      )}
    </figure>
  );
}

/**
 * A short aside for the thing a reader will wonder about two paragraphs later.
 * Deliberately narrow and quiet: it is a footnote you can read, not a callout
 * competing with the figure above it.
 */
export function Aside({ title, children }: { title: string; children: ReactNode }) {
  return (
    <aside className="border-l-2 border-accent pl-5">
      <p className="font-semibold text-sm text-fg-primary">{title}</p>
      <div className="mt-1.5 max-w-copy text-sm leading-relaxed text-fg-secondary">{children}</div>
    </aside>
  );
}
