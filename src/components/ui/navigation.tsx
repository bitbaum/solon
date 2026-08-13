"use client";

import { useState } from "react";
import Logo from "./logo";
import Link from "next/link";
import { NAV_ITEMS } from "@/lib/site-config";

// Structure and copy both come from the site-config SSOT. There is no
// authentication in the product, so the header offers the dashboard
// directly instead of pretending to have a sign-in.

export default function Navigation() {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav
      className="bg-surface-base shadow-sm border-b border-default sticky top-0 z-50"
      aria-label="Main Navigation"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <Logo size="md" />
          </Link>

          {/* Desktop Navigation */}
          <div
            className="hidden lg:flex space-x-1"
            role="menubar"
            aria-label="Main Navigation"
          >
            {NAV_ITEMS.map((item) => (
              <div
                key={item.title}
                className="relative group"
                onMouseEnter={() => setActiveDropdown(item.title)}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                {item.children ? (
                  <button
                    className="flex items-center px-3 py-2 text-sm font-medium text-fg-primary hover:text-navy hover:bg-surface-raised rounded-md transition-colors"
                    aria-haspopup="true"
                    aria-expanded={activeDropdown === item.title}
                    onFocus={() => setActiveDropdown(item.title)}
                    onClick={() =>
                      setActiveDropdown((prev) =>
                        prev === item.title ? null : item.title,
                      )
                    }
                  >
                    {item.title}
                    <ChevronDownIcon className="ml-1 w-4 h-4" />
                  </button>
                ) : (
                  <Link
                    href={item.href || "#"}
                    className="flex items-center px-3 py-2 text-sm font-medium text-fg-primary hover:text-navy hover:bg-surface-raised rounded-md transition-colors"
                  >
                    {item.title}
                  </Link>
                )}

                {/* Mega menu dropdown with hover bridge */}
                {item.children && activeDropdown === item.title && (
                  <>
                    <div className="absolute top-full left-0 w-96 h-2 bg-transparent z-40"></div>

                    <div
                      className="absolute top-full left-0 w-96 bg-surface-base border border-default rounded-md py-6 mt-2 z-50"
                      role="menu"
                      aria-label={`${item.title} menu`}
                    >
                      <div className="px-6 py-2 border-b border-default mb-4">
                        <h3 className="text-lg font-bold text-navy tracking-tight">
                          {item.title}
                        </h3>
                        {item.description && (
                          <p className="text-sm text-fg-secondary mt-1">
                            {item.description}
                          </p>
                        )}
                      </div>
                      <div className="grid grid-cols-1 gap-1">
                        {item.children.map((child) => (
                          <Link
                            key={child.title}
                            href={child.href || "#"}
                            className="flex items-start px-6 py-3 text-sm text-fg-primary hover:text-navy hover:bg-surface-raised transition-all duration-200 group rounded-lg mx-2"
                            role="menuitem"
                          >
                            <div className="w-2 h-2 rounded-full bg-surface-raised mr-4 mt-2 group-hover:bg-navy transition-colors flex-shrink-0"></div>
                            <div className="min-w-0">
                              <div className="font-medium text-fg-primary group-hover:text-navy">
                                {child.title}
                              </div>
                              {child.description && (
                                <div className="text-xs text-fg-secondary mt-1">
                                  {child.description}
                                </div>
                              )}
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="hidden lg:flex items-center space-x-3">
            <Link
              href="/ecosystem"
              className="px-4 py-2 text-sm font-medium text-navy hover:text-navy-light transition-colors"
            >
              Live State
            </Link>
            <Link
              href="/dashboard"
              className="px-4 py-2 text-sm font-medium bg-navy text-white rounded-md hover:bg-navy-light transition-colors"
            >
              Open Dashboard
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="lg:hidden">
            <button
              className="p-2 rounded-md text-fg-primary hover:text-navy hover:bg-surface-raised"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
              aria-expanded={isMobileMenuOpen}
            >
              <MenuIcon className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden bg-surface-base border-t border-default"
          role="menu"
          aria-label="Mobile Navigation"
        >
          <div className="px-4 py-2 space-y-1">
            {NAV_ITEMS.map((item) => (
              <div key={item.title}>
                {item.children ? (
                  <div className="space-y-1">
                    <div className="px-3 py-2 text-sm font-medium text-fg-primary">
                      {item.title}
                    </div>
                    <div className="ml-4 space-y-1">
                      {item.children.map((child) => (
                        <Link
                          key={child.title}
                          href={child.href || "#"}
                          className="block px-3 py-2 text-sm text-fg-secondary hover:text-navy hover:bg-surface-raised rounded-md"
                          role="menuitem"
                        >
                          {child.title}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Link
                    href={item.href || "#"}
                    className="block px-3 py-2 text-sm font-medium text-fg-primary hover:text-navy hover:bg-surface-raised rounded-md"
                    role="menuitem"
                  >
                    {item.title}
                  </Link>
                )}
              </div>
            ))}
            <div className="border-t border-default pt-2 mt-2">
              <Link
                href="/dashboard"
                className="block px-3 py-2 text-sm font-medium bg-navy text-white rounded-md hover:bg-navy-light"
              >
                Open Dashboard
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 9l-7 7-7-7"
      />
    </svg>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 6h16M4 12h16M4 18h16"
      />
    </svg>
  );
}
