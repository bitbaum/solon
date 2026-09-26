"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import Logo from "./logo";
import AuthControl from "./auth-control";
import LanguageSwitcher from "@/components/site/language-switcher";
import { PHOTOS } from "@/lib/content/photos";
import { HIRE_HREF, MENU, SITE_SECTIONS, type MenuSection } from "@/lib/site-config";

/**
 * The header: the mark, four panels, language, sign-in, and one call to action.
 *
 * Each panel opens a full-width sheet: the section's name and what it is for
 * on the left, every page in it with one line on what you will find, and a
 * featured page with its photograph. It opens on click (hover menus flicker
 * and fail on touch), closes on Escape, on a click outside, or when you
 * navigate. It follows the disclosure pattern: each trigger is a button with
 * aria-expanded that controls its sheet.
 *
 * The header is transparent over a page's photograph and turns solid once
 * the reader scrolls or a panel opens. Small screens get the whole map as a
 * full-screen menu instead.
 */
export default function Navigation({ authEnabled = false }: { authEnabled?: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState<MenuSection["key"] | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const header = useRef<HTMLElement>(null);
  const pathname = usePathname();
  const t = useTranslations("Nav");
  const site = useTranslations("Site");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Navigating closes whatever was open. Reset during render when the path
  // changes (React's pattern for deriving state from a changed value) rather
  // than in an effect, which would render the stale menu once first.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(null);
    setMobileOpen(false);
  }

  // Escape closes; a click outside the header closes.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    const onClick = (e: MouseEvent) => {
      if (header.current && !header.current.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  // A menu covering the page must not leave the page scrolling underneath it.
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const solid = scrolled || open !== null || mobileOpen;

  return (
    <>
      <header
        ref={header}
        className={`sticky top-0 z-50 transition-colors duration-300 ${solid ? "header-solid" : ""}`}
      >
        <nav
          className="section-shell flex h-nav items-center justify-between gap-6"
          aria-label={t("main")}
        >
          <Link href="/" aria-label={t("home")} className="inline-flex min-h-11 items-center">
            <Logo size="sm" />
          </Link>

          <ul className="hidden items-center gap-8 lg:flex">
            {MENU.map((section) => {
              const isOpen = open === section.key;
              return (
                <li key={section.key}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={`panel-${section.key}`}
                    onClick={() => setOpen(isOpen ? null : section.key)}
                    className={`flex min-h-11 items-center gap-1.5 text-xs font-bold uppercase tracking-caps transition-opacity hover:opacity-70 ${
                      isOpen ? "text-accent" : "text-fg-primary"
                    }`}
                  >
                    {site(`sections.${section.key}`)}
                    <span
                      aria-hidden="true"
                      className={`text-[0.6rem] transition-transform ${isOpen ? "rotate-180" : ""}`}
                    >
                      ▾
                    </span>
                  </button>
                  {isOpen && <MegaPanel section={section} onNavigate={() => setOpen(null)} />}
                </li>
              );
            })}
          </ul>

          <div className="hidden items-center gap-6 lg:flex">
            <LanguageSwitcher />
            {authEnabled && <AuthControl />}
            <Link href={HIRE_HREF} className="btn-frame min-h-11 px-5">
              {t("hire")}
            </Link>
          </div>

          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center text-fg-primary lg:hidden"
            aria-label={mobileOpen ? t("closeMenu") : t("openMenu")}
            aria-expanded={mobileOpen}
            aria-controls="site-menu"
            onClick={() => setMobileOpen((o) => !o)}
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
              {mobileOpen ? (
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
          descendant, which would collapse this menu to the header's height. */}
      {mobileOpen && (
        <div
          id="site-menu"
          className="fixed inset-x-0 bottom-0 top-nav z-40 overflow-y-auto bg-surface-page lg:hidden"
        >
          <div className="section-shell space-y-10 py-8">
            <div className="flex flex-col gap-3">
              <Link href={HIRE_HREF} className="btn-frame-accent">
                {t("hire")}
              </Link>
              {authEnabled && <AuthControl compact />}
            </div>
            <LanguageSwitcher list onChange={() => setMobileOpen(false)} />
            {SITE_SECTIONS.map((section) => (
              <div key={section.key}>
                <div className="kicker">{site(`sections.${section.key}`)}</div>
                <ul className="mt-3 space-y-1">
                  {section.children.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className="block py-2">
                        <span className="block text-lg font-semibold text-fg-primary">
                          {site(`links.${link.key}`)}
                        </span>
                        <span className="block text-sm text-fg-secondary">
                          {site(`desc.${link.key}`)}
                        </span>
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

/**
 * One panel's sheet. Positioned against the sticky header (its nearest
 * positioned ancestor), so it spans the full width under the bar.
 */
function MegaPanel({ section, onNavigate }: { section: MenuSection; onNavigate: () => void }) {
  const t = useTranslations("Nav");
  const site = useTranslations("Site");
  const alt = useTranslations("Photos");
  const feature = section.feature;

  return (
    <div
      id={`panel-${section.key}`}
      className="absolute inset-x-0 top-full border-y border-subtle bg-surface-page"
    >
      <div className="section-shell grid gap-10 py-10 lg:grid-cols-[16rem_1fr_18rem]">
        <div>
          <div className="headline-caps text-3xl">{site(`sections.${section.key}`)}</div>
          <p className="mt-3 text-sm text-fg-secondary">{site(`sectionDesc.${section.key}`)}</p>
          <Link
            href={section.href}
            onClick={onNavigate}
            className="mt-4 inline-flex min-h-11 items-center text-xs font-bold uppercase tracking-caps text-fg-primary underline underline-offset-4"
          >
            {t("overview")} →
          </Link>
        </div>

        <ul className="grid content-start gap-x-8 gap-y-1 sm:grid-cols-2">
          {section.children.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                onClick={onNavigate}
                className="block rounded-control px-3 py-3 transition-colors hover:bg-surface-raised"
              >
                <span className="block font-semibold text-fg-primary">
                  {site(`links.${link.key}`)}
                </span>
                <span className="mt-0.5 block text-sm text-fg-secondary">
                  {site(`desc.${link.key}`)}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        {feature && (
          <Link href={feature.href} onClick={onNavigate} className="group block">
            <div className="relative aspect-[4/3] overflow-hidden bg-surface-public">
              <Image
                src={PHOTOS[feature.photo].image}
                alt={alt(feature.photo)}
                fill
                sizes="18rem"
                placeholder="blur"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </div>
            <div className="kicker mt-4">{t("featured")}</div>
            <div className="mt-1 font-semibold text-fg-primary">
              {site(`links.${feature.link}`)}
            </div>
            <div className="text-sm text-fg-secondary">{site(`desc.${feature.link}`)}</div>
          </Link>
        )}
      </div>
    </div>
  );
}
