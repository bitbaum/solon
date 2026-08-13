import Link from 'next/link';
import { NAV_ITEMS, REPOSITORY_URL, ROUTES } from '@/lib/site-config';

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white" aria-label="Site footer">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-[1.25fr_1fr_1fr]">
          <div>
            <p className="font-display text-lg font-bold text-navy">SOLON</p>
            <p className="mt-3 max-w-sm text-sm leading-6 text-slate-600">
              Bitcoin-native treasury transparency and signed-vote verification primitives.
            </p>
            <Link href={ROUTES.dashboard} className="mt-4 inline-flex min-h-11 items-center font-semibold text-navy underline decoration-solon-orange decoration-2 underline-offset-4">
              Open the dashboard
            </Link>
          </div>

          {NAV_ITEMS.map((section) => (
            <div key={section.title}>
              <h2 className="text-sm font-semibold text-navy">{section.title}</h2>
              <ul className="mt-3 space-y-1 text-sm text-slate-600">
                {section.items.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="inline-flex min-h-11 items-center hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-solon-orange">
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-slate-200 pt-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Solon. Open-source governance infrastructure.</p>
          <a href={REPOSITORY_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-solon-orange">
            Source code <span className="sr-only">(opens in a new tab)</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
