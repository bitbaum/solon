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
    <main className={`section-shell py-16 sm:py-20 ${className}`}>
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="font-display text-4xl text-fg-primary sm:text-5xl">
          {title}
        </h1>
        {description && (
          <p className="mt-4 text-lg text-fg-secondary">{description}</p>
        )}
      </div>
      <div className="mt-14">{children}</div>
    </main>
  );
}
