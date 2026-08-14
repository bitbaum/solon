interface PageLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  className?: string;
}

/**
 * The standard content page: title block, then content. Owns its own width —
 * the root layout deliberately has no container so marketing sections can run
 * full-bleed, which means every page is responsible for its own shell.
 */
export default function PageLayout({
  children,
  title,
  description,
  className = "",
}: PageLayoutProps) {
  return (
    <main className={`section-shell py-section-tight ${className}`}>
      <div className="mx-auto max-w-lede text-center">
        <h1 className="font-display text-display-2 font-bold tracking-display text-fg-primary">
          {title}
        </h1>
        {description && (
          <p className="mt-6 text-lg text-fg-secondary">{description}</p>
        )}
      </div>
      <div className="mt-20">{children}</div>
    </main>
  );
}
