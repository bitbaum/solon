"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { title: "Overview", href: "/dashboard" },
  { title: "Treasury", href: "/dashboard/treasury" },
  { title: "Voting", href: "/dashboard/voting" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="py-8 space-y-8">
      <div className="bg-surface-base border border-default rounded-surface">
        <nav className="flex gap-1 p-1" aria-label="Dashboard sections">
          {TABS.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`px-4 py-2 text-sm font-medium rounded-control transition-colors ${
                  active
                    ? "bg-surface-raised text-fg-primary ring-1 ring-default"
                    : "text-fg-primary hover:text-fg-primary hover:bg-surface-raised"
                }`}
              >
                {tab.title}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="bg-surface-base border border-default rounded-surface p-6">
        {children}
      </div>
    </div>
  );
}
