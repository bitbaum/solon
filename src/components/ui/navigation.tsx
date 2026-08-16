"use client";

import { useState } from "react";
import Logo from "./logo";
import Link from "next/link";
import { NAV_ITEMS } from "@/lib/site-config";
import AuthControl from "./auth-control";

// Structure and copy both come from the site-config SSOT. Sign-in is
// recognition only (one provider: OrangeCat, the stack's identity root) —
// every page and vote works without it, so nothing here is gated on it.

export default function Navigation({ authEnabled = false }: { authEnabled?: boolean }) {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav
      className="sticky top-0 z-50 border-b border-subtle bg-surface-page/80 backdrop-blur-lg"
      aria-label="Main Navigation"
    >
      <div className="section-shell">
        <div className="flex h-nav items-center justify-between gap-4">
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
                    className="flex items-center px-3 py-2 text-sm font-medium text-fg-secondary hover:text-fg-primary hover:bg-surface-raised rounded-control transition-colors"
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
                    className="flex items-center px-3 py-2 text-sm font-medium text-fg-secondary hover:text-fg-primary hover:bg-surface-raised rounded-control transition-colors"
                  >
                    {item.title}
                  </Link>
                )}

                {/* Mega menu dropdown with hover bridge */}
                {item.children && activeDropdown === item.title && (
                  <>
                    <div className="absolute top-full left-0 w-96 h-2 bg-transparent z-40"></div>

                    <div
                      className="absolute top-full left-0 w-96 rounded-surface border border-default bg-surface-base py-6 mt-2 z-50"
                      role="menu"
                      aria-label={`${item.title} menu`}
                    >
                      <div className="px-6 pb-3 border-b border-subtle mb-3">
                        <h3 className="text-base font-semibold text-fg-primary">
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
                            className="group mx-2 flex items-start rounded-control px-6 py-3 text-sm transition-colors hover:bg-surface-raised"
                            role="menuitem"
                          >
                            <div className="mr-4 mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-pill bg-border-strong transition-colors group-hover:bg-accent"></div>
                            <div className="min-w-0">
                              <div className="font-medium text-fg-secondary group-hover:text-fg-primary">
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
            {authEnabled && <AuthControl />}
            <Link
              href="/ecosystem"
              className="px-3 py-2 text-sm font-medium text-fg-secondary transition-colors hover:text-fg-primary"
            >
              Live State
            </Link>
            <Link
              href="/dashboard"
              className="rounded-control bg-accent px-4 py-2 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-hover"
            >
              Open Dashboard
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="lg:hidden">
            <button
              className="rounded-control p-2 text-fg-secondary hover:bg-surface-raised hover:text-fg-primary"
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
          className="lg:hidden border-t border-subtle bg-surface-page"
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
                          className="block rounded-control px-3 py-2 text-sm text-fg-secondary hover:bg-surface-raised hover:text-fg-primary"
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
                    className="block rounded-control px-3 py-2 text-sm font-medium text-fg-secondary hover:bg-surface-raised hover:text-fg-primary"
                    role="menuitem"
                  >
                    {item.title}
                  </Link>
                )}
              </div>
            ))}
            <div className="border-t border-subtle pt-2 mt-2 space-y-1">
              {authEnabled && <AuthControl compact />}
              <Link
                href="/dashboard"
                className="block rounded-control bg-accent px-3 py-2 text-sm font-semibold text-on-accent hover:bg-accent-hover"
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
