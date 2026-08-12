"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { title: "Overview", href: "/dashboard" },
  { title: "Treasury", href: "/dashboard/treasury" },
  { title: "Voting", href: "/dashboard/voting" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="py-8 space-y-8">
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <nav className="flex gap-1 p-1" aria-label="Dashboard sections">
          {TABS.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  active
                    ? "bg-solon-light text-navy ring-1 ring-gray-200"
                    : "text-gray-700 hover:text-navy hover:bg-gray-50"
                }`}
              >
                {tab.title}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
        {children}
      </div>
    </div>
  );
}
