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
 * content. Left-aligned like the full-screen sections, so moving from the front
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
      <header className="border-b border-subtle pb-12">
        {kicker && <div className="kicker">{kicker}</div>}
        <h1
          className={`headline-caps max-w-4xl text-4xl sm:text-5xl lg:text-6xl ${kicker ? "mt-5" : ""}`}
        >
          {title}
        </h1>
        {description && <p className="mt-6 max-w-2xl text-lg text-fg-secondary">{description}</p>}
      </header>
      <div className="mt-16">{children}</div>
    </main>
  );
}
