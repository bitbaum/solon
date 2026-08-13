"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Menu, X } from 'lucide-react';
import Logo from './logo';
import { NAV_ITEMS, ROUTES, type AppRoute } from '@/lib/site-config';

function isCurrentRoute(pathname: string, href: AppRoute) {
  return href === ROUTES.home ? pathname === href : pathname.startsWith(href);
}

export default function Navigation() {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setActiveDropdown(null);
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setActiveDropdown(null);
      setIsMobileMenuOpen(false);
    };
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!navRef.current?.contains(event.target as Node)) setActiveDropdown(null);
    };
    document.addEventListener('keydown', closeOnEscape);
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      document.removeEventListener('mousedown', closeOnOutsideClick);
    };
  }, []);

  return (
    <nav ref={navRef} className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur" aria-label="Main navigation">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href={ROUTES.home} className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-solon-orange" aria-label="Solon home">
          <Logo size="md" />
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {NAV_ITEMS.map((section) => {
            const isOpen = activeDropdown === section.title;
            const containsCurrentPage = section.items.some((item) => isCurrentRoute(pathname, item.href));
            return (
              <div
                key={section.title}
                className="relative"
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) setActiveDropdown(null);
                }}
              >
                <button
                  type="button"
                  className={`flex min-h-11 items-center rounded-md px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-solon-orange ${
                    containsCurrentPage ? 'bg-slate-100 text-navy' : 'text-slate-700 hover:bg-slate-50 hover:text-navy'
                  }`}
                  aria-haspopup="menu"
                  aria-expanded={isOpen}
                  onClick={() => setActiveDropdown(isOpen ? null : section.title)}
                >
                  {section.title}
                  <ChevronDown className={`ml-1 h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                </button>

                {isOpen && (
                  <div className="absolute left-0 top-full pt-2">
                    <div className="w-80 rounded-xl border border-slate-200 bg-white p-2 shadow-lg" role="menu" aria-label={`${section.title} links`}>
                      <div className="px-3 pb-2 pt-1">
                        <p className="font-display font-bold text-navy">{section.title}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{section.description}</p>
                      </div>
                      {section.items.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          role="menuitem"
                          aria-current={isCurrentRoute(pathname, item.href) ? 'page' : undefined}
                          className="block rounded-lg px-3 py-2.5 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-solon-orange"
                        >
                          <span className="block text-sm font-semibold text-navy">{item.title}</span>
                          <span className="mt-0.5 block text-xs leading-5 text-slate-500">{item.description}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <Link href={ROUTES.dashboard} className="min-h-11 rounded-md px-4 py-3 text-sm font-semibold text-navy transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-solon-orange">
            Open dashboard
          </Link>
          <Link href={ROUTES.dashboardVoting} className="min-h-11 rounded-md bg-navy px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-navy-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-solon-orange">
            Explore voting
          </Link>
        </div>

        <button
          type="button"
          className="flex min-h-11 min-w-11 items-center justify-center rounded-md text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-solon-orange lg:hidden"
          onClick={() => setIsMobileMenuOpen((open) => !open)}
          aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-controls="mobile-navigation"
          aria-expanded={isMobileMenuOpen}
        >
          {isMobileMenuOpen ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
        </button>
      </div>

      {isMobileMenuOpen && (
        <div id="mobile-navigation" className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-slate-200 bg-white px-4 py-4 lg:hidden">
          <div className="mx-auto max-w-7xl space-y-5">
            {NAV_ITEMS.map((section) => (
              <section key={section.title} aria-labelledby={`mobile-${section.title.toLowerCase()}`}>
                <h2 id={`mobile-${section.title.toLowerCase()}`} className="px-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  {section.title}
                </h2>
                <div className="mt-1 grid gap-1">
                  {section.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={isCurrentRoute(pathname, item.href) ? 'page' : undefined}
                      className={`min-h-11 rounded-md px-3 py-2.5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-solon-orange ${
                        isCurrentRoute(pathname, item.href) ? 'bg-slate-100 text-navy' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {item.title}
                    </Link>
                  ))}
                </div>
              </section>
            ))}
            <div className="grid grid-cols-2 gap-3 border-t border-slate-200 pt-4">
              <Link href={ROUTES.dashboard} className="flex min-h-11 items-center justify-center rounded-md border border-slate-300 px-3 py-2 text-center text-sm font-semibold text-navy">
                Dashboard
              </Link>
              <Link href={ROUTES.dashboardVoting} className="flex min-h-11 items-center justify-center rounded-md bg-navy px-3 py-2 text-center text-sm font-semibold text-white">
                Explore voting
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
