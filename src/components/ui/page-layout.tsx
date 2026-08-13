interface PageLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  className?: string;
}

export default function PageLayout({ children, title, description, className = "" }: PageLayoutProps) {
  return (
    <div className={`min-h-screen ${className}`}>
      <div className="pb-14 pt-10 sm:pb-20 sm:pt-16">
        <div className="mb-10 text-center sm:mb-16">
          <h1 className="font-display text-3xl font-bold text-navy sm:text-4xl">{title}</h1>
          {description && (
            <p className="mx-auto mt-4 max-w-3xl text-base leading-7 text-slate-600 sm:text-xl">{description}</p>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
