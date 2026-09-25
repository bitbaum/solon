"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { title: "Overview", href: "/dashboard" },
  { title: "Treasury", href: "/dashboard/treasury" },
  { title: "Voting", href: "/dashboard/voting" },
];

/**
 * The working screens. Same page edge as every other page (section-shell), a
 * plain underlined tab row, and no frame around the content: the content's own
 * sections carry their borders, so wrapping them in another box only nests
 * cards inside cards.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="section-shell py-section-tight">
      <div className="kicker">Dashboard</div>
      <nav className="mt-5 flex gap-8 border-b border-subtle" aria-label="Dashboard sections">
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
      <div className="pt-10">{children}</div>
    </div>
  );
}
