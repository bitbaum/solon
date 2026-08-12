interface PageLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  className?: string;
}

export default function PageLayout({ children, title, description, className = "" }: PageLayoutProps) {
  return (
    <div className={`min-h-screen ${className}`}>
      <div className="pt-16 pb-20">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-navy mb-4">{title}</h1>
          {description && (
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">{description}</p>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}