"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Logo from "./logo";
import AuthControl from "./auth-control";
import LanguageSwitcher from "@/components/site/language-switcher";
import { HIRE_HREF, PRIMARY_NAV, SITE_SECTIONS } from "@/lib/site-config";

/**
 * The header: the mark, three links, sign-in, and one call to action.
 *
 * It is transparent at the top of a page, so a full-screen photograph can run
 * underneath it, and turns solid once the reader scrolls. Everything that is
 * not one of the three links lives in the menu (small screens) and the footer.
 */
export default function Navigation({ authEnabled = false }: { authEnabled?: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const t = useTranslations("Nav");
  const site = useTranslations("Site");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // A menu covering the page must not leave the page scrolling underneath it.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const solid = scrolled || menuOpen;

  return (
    <>
      <header
        className={`sticky top-0 z-50 transition-colors duration-300 ${solid ? "header-solid" : ""}`}
      >
        <nav
          className="section-shell flex h-nav items-center justify-between gap-6"
          aria-label={t("main")}
        >
          <Link href="/" aria-label={t("home")} onClick={() => setMenuOpen(false)}>
            <Logo size="sm" />
          </Link>

          <ul className="hidden items-center gap-9 lg:flex">
            {PRIMARY_NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-xs font-bold uppercase tracking-caps text-fg-primary transition-opacity hover:opacity-70"
                >
                  {site(`links.${item.key}`)}
                </Link>
              </li>
            ))}
          </ul>

          <div className="hidden items-center gap-6 lg:flex">
            <LanguageSwitcher />
            {authEnabled && <AuthControl />}
            <Link href={HIRE_HREF} className="btn-frame min-h-10 px-5">
              {t("hire")}
            </Link>
          </div>

          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center text-fg-primary lg:hidden"
            aria-label={menuOpen ? t("closeMenu") : t("openMenu")}
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
              {menuOpen ? (
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" />
              ) : (
                <path d="M3 7h18M3 12h18M3 17h18" stroke="currentColor" strokeWidth="2" />
              )}
            </svg>
          </button>
        </nav>
      </header>

      {/* A sibling of the header, not a child: the solid header's
          backdrop-filter makes it the containing block for any fixed
          descendant, which collapsed this menu to the header's own height. */}
      {menuOpen && (
        <div
          id="site-menu"
          className="fixed inset-x-0 bottom-0 top-nav z-40 overflow-y-auto bg-surface-page lg:hidden"
        >
          <div className="section-shell space-y-10 py-8">
            <div className="flex flex-col gap-3">
              <Link
                href={HIRE_HREF}
                className="btn-frame-accent"
                onClick={() => setMenuOpen(false)}
              >
                {t("hire")}
              </Link>
              {authEnabled && <AuthControl compact />}
            </div>
            <LanguageSwitcher list onChange={() => setMenuOpen(false)} />
            {SITE_SECTIONS.map((section) => (
              <div key={section.key}>
                <div className="kicker">{site(`sections.${section.key}`)}</div>
                <ul className="mt-3 space-y-1">
                  {section.children.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        onClick={() => setMenuOpen(false)}
                        className="block py-2 text-lg font-semibold text-fg-primary"
                      >
                        {site(`links.${link.key}`)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
