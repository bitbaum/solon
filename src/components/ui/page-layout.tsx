interface PageLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  /** The small label above the title — which part of the site this is. */
  kicker?: string;
  className?: string;
}

/**
 * The standard content page: a left-aligned title block over a rule, then the
 * content. An app screen's title is `.headline`, sentence case, as in the
 * fleet's other apps; `.headline-caps` is kept for the full-screen statements
 * of the front page and the explainers. Left-aligned like the full-screen sections, so moving from the front
 * page into any inner page keeps the same edge. Owns its own width — the root
 * layout has no container so sections can run full-bleed.
 */
export default function PageLayout({
  children,
  title,
  description,
  kicker,
  className = "",
}: PageLayoutProps) {
  return (
    <main className={`section-shell py-section-tight ${className}`}>
      <header className="border-b border-subtle pb-8">
        {kicker && <div className="kicker">{kicker}</div>}
        <h1
          className={`headline max-w-4xl text-3xl sm:text-4xl lg:text-5xl ${kicker ? "mt-4" : ""}`}
        >
          {title}
        </h1>
        {description && (
          <p className="mb-0 mt-4 max-w-2xl text-lg text-fg-secondary">{description}</p>
        )}
      </header>
      <div className="mt-10">{children}</div>
    </main>
  );
}
