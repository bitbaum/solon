"use client";

import { Link } from "@/i18n/navigation";
import { usePathname } from "@/i18n/navigation";

const TABS = [
  { title: "Overview", href: "/dashboard" },
  { title: "Money", href: "/dashboard/treasury" },
  { title: "Votes", href: "/dashboard/voting" },
];

/** The dashboard's three views, under the page title. */
export default function DashboardTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-8 border-b border-subtle" aria-label="Dashboard sections">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px border-b-2 pb-3 text-sm font-semibold transition-colors ${
              active
                ? "border-accent text-fg-primary"
                : "border-transparent text-fg-secondary hover:text-fg-primary"
            }`}
          >
            {tab.title}
          </Link>
        );
      })}
    </nav>
  );
}
