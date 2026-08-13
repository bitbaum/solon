"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DASHBOARD_NAV_ITEMS } from '@/lib/site-config';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-5 py-6 sm:space-y-8 sm:py-8">
      <nav className="overflow-x-auto rounded-lg border border-slate-200 bg-white p-1 shadow-sm" aria-label="Dashboard navigation">
        <div className="flex min-w-max gap-1">
          {DASHBOARD_NAV_ITEMS.map((item) => {
            const isCurrent = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isCurrent ? 'page' : undefined}
                className={`flex min-h-11 items-center rounded-md px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-solon-orange ${
                  isCurrent ? 'bg-navy text-white' : 'text-slate-700 hover:bg-slate-50 hover:text-navy'
                }`}
              >
                {item.title}
              </Link>
            );
          })}
        </div>
      </nav>
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-6">{children}</div>
    </div>
  );
}
