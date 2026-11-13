import type { ReactNode } from "react";

/**
 * A place page's frame, one for every place: its hero, then the page in two
 * columns, what a reader came to do on the left and the place at a glance on
 * the right. On a phone the glance comes first, under the hero.
 */
export default function ProfileFrame({
  hero,
  aside,
  wide = false,
  children,
}: {
  hero: ReactNode;
  aside?: ReactNode;
  /** A page that is a wall of places, not a column of text: the full width. */
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <>
      {hero}
      <main className="section-shell py-section-tight">
        <div
          className={
            aside
              ? "grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-16"
              : wide
                ? ""
                : "max-w-4xl"
          }
        >
          {aside && (
            <aside className="min-w-0 lg:order-2">
              <div className="space-y-6 lg:sticky lg:top-24">{aside}</div>
            </aside>
          )}
          <div className="min-w-0 space-y-12 lg:order-1">{children}</div>
        </div>
      </main>
    </>
  );
}
